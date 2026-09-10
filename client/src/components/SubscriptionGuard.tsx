import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profileCheck, setProfileCheck] = useState<boolean | null>(null);
  const [guardError, setGuardError] = useState("");
  const [retry, setRetry] = useState(0);
  const isMemberAppRoute = location.pathname.startsWith("/app/");
  useEffect(() => { setAllowed(null); setGuardError(""); if (["/discover", "/app/discover"].includes(location.pathname) || location.pathname.startsWith("/app/profile/")) { setAllowed(true); return; } if (user) api<{ subscription: unknown; membershipRequired: boolean }>("/subscriptions/current").then((data) => setAllowed(!data.membershipRequired || Boolean(data.subscription))).catch((value) => { setAllowed(false); setGuardError(value instanceof Error ? value.message : "We could not confirm membership right now."); }); }, [user, location.pathname, retry]);
  useEffect(() => { setProfileCheck(null); if (!user || !isMemberAppRoute) { setProfileCheck(true); return; } api<{ completion: number }>("/profile/me").then((profile) => setProfileCheck(profile.completion >= 60)).catch(() => setProfileCheck(true)); }, [user, location.pathname, isMemberAppRoute]);
  if (authLoading || (user && allowed === null) || profileCheck === null) return <div className="p-10 text-center text-charcoal/60">{isMemberAppRoute ? "Preparing your private space..." : "Checking membership..."}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (guardError) return <div role="alert" className="mx-auto max-w-xl p-10 text-center text-sm text-red-800"><p>{guardError}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 rounded-full bg-burgundy px-5 py-3 font-semibold text-cream">Try again</button></div>;
  if (!profileCheck) return <Navigate to="/app/profile" replace state={{ from: location.pathname }} />;
  return allowed ? <Outlet /> : <Navigate to={location.pathname.includes("/messages") ? "/membership?reason=chat" : "/membership"} replace />;
}
