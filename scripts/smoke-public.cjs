(async () => {
const baseUrl = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

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
];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, { redirect: "manual" });
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
