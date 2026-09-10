import { clientEnv } from "../env";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${clientEnv.VITE_API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session refresh failed");
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

const skipRefresh = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"];

export async function api<T>(path: string, options: RequestInit = {}, canRefresh = true): Promise<T> {
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
    let payload: { success: boolean; data?: T; error?: { message?: string; code?: string } } | null = null;
    try {
      payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
    } catch {
      payload = null;
    }
    if (response.status === 401 && canRefresh && !skipRefresh.some((route) => path.startsWith(route))) {
      try {
        await refreshSession();
        return api<T>(path, options, false);
      } catch {
        // Preserve the original API error below when the refresh cookie is also invalid.
      }
    }
    if (!response.ok || !payload?.success) throw new ApiError(payload?.error?.message ?? `Request failed with status ${response.status}`, response.status, payload?.error?.code);
    return payload.data as T;
  } finally {
    clearTimeout(timeout);
    if (signal && onAbort) signal.removeEventListener("abort", onAbort);
  }
}

export type AuthUser = { id: string; email: string; displayName: string; gender: string; isEmailVerified: boolean; status: string; role: "USER" | "ADMIN" };
