import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type AuthUser } from "../lib/api";

const AuthContext = createContext<{ user: AuthUser | null; loading: boolean; signOut: () => Promise<void> }>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<{ user: AuthUser }>("/auth/me").then((result) => setUser(result.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function signOut() { await api("/auth/logout", { method: "POST" }); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
