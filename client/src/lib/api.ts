import { clientEnv } from "../env";

export async function api<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${clientEnv.VITE_API_BASE_URL}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers } });
  const payload = await response.json() as { success: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Something went wrong");
  return payload.data as T;
}

export type AuthUser = { id: string; email: string; displayName: string; gender: string; isEmailVerified: boolean; status: string; role: "USER" | "ADMIN" };
