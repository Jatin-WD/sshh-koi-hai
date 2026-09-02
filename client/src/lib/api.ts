import { clientEnv } from "../env";

export async function api<T>(path: string, options: RequestInit = {}) {
  const signal = options.signal ?? AbortSignal.timeout(Number(clientEnv.VITE_API_TIMEOUT_MS ?? 15000));
  const response = await fetch(`${clientEnv.VITE_API_BASE_URL}${path}`, { ...options, signal, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers } });
  let payload: { success: boolean; data?: T; error?: { message?: string } } | null = null;
  try {
    payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
  } catch {
    payload = null;
  }
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  return payload.data as T;
}

export type AuthUser = { id: string; email: string; displayName: string; gender: string; isEmailVerified: boolean; status: string; role: "USER" | "ADMIN" };
