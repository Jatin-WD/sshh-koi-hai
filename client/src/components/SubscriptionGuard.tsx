import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profileCheck, setProfileCheck] = useState<boolean | null>(null);
  useEffect(() => { setAllowed(null); if (["/discover", "/app/discover"].includes(location.pathname) || location.pathname.startsWith("/app/profile/")) { setAllowed(true); return; } if (user) api<{ subscription: unknown; membershipRequired: boolean }>("/subscriptions/current").then((data) => setAllowed(!data.membershipRequired || Boolean(data.subscription))).catch(() => setAllowed(false)); }, [user, location.pathname]);
  useEffect(() => { setProfileCheck(null); if (!user || !["/discover", "/app/discover"].includes(location.pathname)) { setProfileCheck(true); return; } api<{ completion: number }>("/profile/me").then((profile) => setProfileCheck(profile.completion >= 60)).catch(() => setProfileCheck(true)); }, [user, location.pathname]);
  if (authLoading || (user && allowed === null) || profileCheck === null) return <div className="p-10 text-center text-charcoal/60">{["/discover", "/app/discover"].includes(location.pathname) || location.pathname.startsWith("/app/profile/") ? "Loading profiles..." : "Checking membership..."}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profileCheck) return <Navigate to="/app/profile" replace state={{ from: location.pathname }} />;
  return allowed ? <Outlet /> : <Navigate to={location.pathname.includes("/messages") ? "/membership?reason=chat" : "/membership"} replace />;
}
