import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { if (user) api<{ subscription: unknown; membershipRequired: boolean }>("/subscriptions/current").then((data) => setAllowed(!data.membershipRequired || Boolean(data.subscription))).catch(() => setAllowed(false)); }, [user]);
  if (authLoading || (user && allowed === null)) return <div className="p-10 text-center text-charcoal/60">Checking membership...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return allowed ? <Outlet /> : <Navigate to="/membership" replace />;
}
