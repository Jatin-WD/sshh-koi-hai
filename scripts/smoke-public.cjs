(async () => {
const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { redirect: "manual" });
    if (![502, 503, 504].includes(response.status) || attempt === 2) return response;
    await sleep(1000 * (attempt + 1));
  }
  throw new Error("Request retry limit reached");
}

const checks = [
  { path: "/", status: 200, html: true },
  { path: "/how-it-works", status: 200, html: true },
  { path: "/safety", status: 200, html: true },
  { path: "/privacy", status: 200, html: true },
  { path: "/membership", status: 200, html: true },
  { path: "/join", status: 200, html: true },
  { path: "/app/discover", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/app/profile", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/app/likes", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/app/matches", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/app/messages", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/settings", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/discover", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/messages", status: 200, html: true, contains: 'name="robots" content="noindex,nofollow"' },
  { path: "/robots.txt", status: 200, html: true },
  { path: "/api/health", status: 200, json: (body) => body.success === true && body.status === "ok" },
  { path: "/api/subscriptions/plans", status: 200, json: (body) => Array.isArray(body.plans) && body.plans.every((plan) => plan.code && plan.currency && plan.price !== undefined) },
  { path: "/api/profile/me", status: 401, json: (body) => body.success === false },
  { path: "/api/discover", status: 401, json: (body) => body.success === false },
  { path: "/api/interests/received", status: 401, json: (body) => body.success === false },
  { path: "/api/admin/stats", status: 401, json: (body) => body.success === false },
];

for (const check of checks) {
  const response = await fetchWithRetry(`${baseUrl}${check.path}`);
  const raw = await response.text();
  let body = null;
  try { body = JSON.parse(raw); } catch { /* HTML/text response expected. */ }
  if (response.status !== check.status) throw new Error(`${check.path}: expected ${check.status}, received ${response.status}`);
  if (check.html && !raw.trim()) throw new Error(`${check.path}: empty response`);
  if (check.contains && !raw.includes(check.contains)) throw new Error(`${check.path}: expected response marker is missing`);
  if (check.json && !check.json(body?.data ?? body)) throw new Error(`${check.path}: unexpected response shape`);
  console.log(`PASS ${check.path} (${response.status})`);
}

console.log(`Public smoke checks passed for ${baseUrl}`);
})().catch((error) => { console.error(`Smoke checks failed: ${error.message}`); process.exitCode = 1; });
