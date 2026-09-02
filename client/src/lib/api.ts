import { clientEnv } from "../env";

export async function api<T>(path: string, options: RequestInit = {}) {
  const timeoutMs = Number(clientEnv.VITE_API_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
  const signal = options.signal;
  const onAbort = signal ? () => controller.abort(signal.reason) : undefined;
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else if (onAbort) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    const response = await fetch(`${clientEnv.VITE_API_BASE_URL}${path}`, { ...options, signal: controller.signal, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers } });
  let payload: { success: boolean; data?: T; error?: { message?: string } } | null = null;
  try {
    payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
    return payload.data as T;
  } finally {
    clearTimeout(timeout);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}

export type AuthUser = { id: string; email: string; displayName: string; gender: string; isEmailVerified: boolean; status: string; role: "USER" | "ADMIN" };
