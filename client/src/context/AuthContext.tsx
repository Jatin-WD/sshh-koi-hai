import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type AuthUser } from "../lib/api";

const AuthContext = createContext<{ user: AuthUser | null; loading: boolean; refreshUser: () => Promise<AuthUser | null>; signOut: () => Promise<void> }>({ user: null, loading: true, refreshUser: async () => null, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  async function refreshUser() {
    try {
      const result = await api<{ user: AuthUser }>("/auth/me");
      setUser(result.user);
      return result.user;
    } catch (error) {
      // Keep an existing session during temporary API/DB outages. Only a
      // confirmed 401 means the local user is no longer authenticated.
      if (error instanceof ApiError && error.status === 401) setUser(null);
      return null;
    }
  }
  useEffect(() => { refreshUser().finally(() => setLoading(false)); }, []);
  async function signOut() {
    try { await api("/auth/logout", { method: "POST" }); }
    catch { /* Clear the local session even when the server is temporarily unavailable. */ }
    finally { setUser(null); }
  }
  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
