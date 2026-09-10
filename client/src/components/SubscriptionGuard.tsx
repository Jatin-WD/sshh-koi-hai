import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function SubscriptionGuard() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [profileCheck, setProfileCheck] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [guardError, setGuardError] = useState("");
  const [retry, setRetry] = useState(0);
  const isMemberAppRoute = location.pathname.startsWith("/app/");
  useEffect(() => { setAllowed(null); setGuardError(""); if (["/discover", "/app/discover", "/app/profile"].includes(location.pathname) || location.pathname.startsWith("/app/profile/")) { setAllowed(true); return; } if (user) api<{ subscription: unknown; membershipRequired: boolean }>("/subscriptions/current").then((data) => setAllowed(!data.membershipRequired || Boolean(data.subscription))).catch((value) => { setAllowed(false); setGuardError(value instanceof Error ? value.message : "We could not confirm membership right now."); }); }, [user, location.pathname, retry]);
  useEffect(() => { setProfileCheck(null); setProfileError(""); setSessionExpired(false); if (!user || !isMemberAppRoute) { setProfileCheck(true); return; } api<{ completion: number }>("/profile/me").then((profile) => setProfileCheck(profile.completion >= 45)).catch((value) => { if (value instanceof ApiError && value.status === 401) { setSessionExpired(true); return; } setProfileCheck(null); setProfileError(value instanceof Error ? value.message : "We could not load your profile right now."); }); }, [user, location.pathname, isMemberAppRoute, retry]);
  if (authLoading || (user && allowed === null) || (profileCheck === null && !profileError && !sessionExpired)) return <div className="p-10 text-center text-charcoal/60">{isMemberAppRoute ? "Preparing your private space..." : "Checking membership..."}</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (sessionExpired) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (guardError || profileError) return <div role="alert" className="mx-auto max-w-xl p-10 text-center text-sm text-red-800"><p>{guardError || profileError}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-4 rounded-full bg-burgundy px-5 py-3 font-semibold text-cream">Try again</button></div>;
  if (!profileCheck) return <Navigate to="/app/profile" replace state={{ from: location.pathname }} />;
  return allowed ? <Outlet /> : <Navigate to={location.pathname.includes("/messages") ? "/membership?reason=chat" : "/membership"} replace />;
}
