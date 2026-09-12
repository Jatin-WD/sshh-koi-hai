import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";

type MembershipStatus = { status?: string };

const FIRST_POPUP_DELAY_MS = 60_000;
const POPUP_INTERVAL_MS = 10 * 60_000;
const MAX_POPUPS_PER_SESSION = 3;
const POPUP_COUNT_KEY = "subscription-nudge-count";

export default function SubscriptionNudge() {
  const location = useLocation();
  const [hasActiveMembership, setHasActiveMembership] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const lastShownAt = useRef(0);
  const firstActivityAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<MembershipStatus>("/subscriptions/current")
      .then((membership) => { if (!cancelled) setHasActiveMembership(membership.status === "ACTIVE"); })
      .catch(() => { if (!cancelled) setHasActiveMembership(false); });
    return () => { cancelled = true; };
  }, [location.pathname]);

  useEffect(() => {
    if (location.search.includes("membership=activated")) {
      setOpen(false);
      setHasActiveMembership(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (hasActiveMembership !== false) return;

    const popupCount = () => Number(sessionStorage.getItem(POPUP_COUNT_KEY) || "0");
    const showForActivity = () => {
      const now = Date.now();
      if (open || popupCount() >= MAX_POPUPS_PER_SESSION) return;
      if (lastShownAt.current && now - lastShownAt.current < POPUP_INTERVAL_MS) return;
      if (!firstActivityAt.current) {
        firstActivityAt.current = now;
        timer.current = setTimeout(() => {
          if (!open && popupCount() < MAX_POPUPS_PER_SESSION) {
            lastShownAt.current = Date.now();
            sessionStorage.setItem(POPUP_COUNT_KEY, String(popupCount() + 1));
            setOpen(true);
          }
        }, FIRST_POPUP_DELAY_MS);
        return;
      }
      if (now - firstActivityAt.current >= FIRST_POPUP_DELAY_MS) {
        lastShownAt.current = now;
        sessionStorage.setItem(POPUP_COUNT_KEY, String(popupCount() + 1));
        setOpen(true);
      }
    };
    const events: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, showForActivity, { passive: true }));
    return () => {
      events.forEach((event) => window.removeEventListener(event, showForActivity));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hasActiveMembership, open]);

  if (hasActiveMembership !== false || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex min-h-[100dvh] items-center justify-center bg-charcoal/60 p-5" role="dialog" aria-modal="true" aria-labelledby="subscription-nudge-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-cream shadow-soft">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/25" />
        <div className="relative bg-plum px-7 pb-7 pt-8 text-cream sm:px-9">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close subscription offer" className="absolute right-5 top-5 rounded-full border border-cream/25 px-3 py-1 text-lg leading-none text-cream/80 hover:bg-cream/10">×</button>
          <p className="text-xs uppercase tracking-[0.28em] text-gold">Make the first hello easier</p>
          <h2 id="subscription-nudge-title" className="mt-4 font-display text-3xl leading-tight sm:text-4xl">Unlock unlimited chat</h2>
          <p className="mt-4 text-sm leading-6 text-cream/70">Connect with more people and keep conversations moving.</p>
        </div>
        <div className="px-7 py-7 sm:px-9">
          <p className="rounded-2xl border border-gold/50 bg-gold/15 px-4 py-4 text-center text-base font-bold text-burgundy shadow-sm">Increase your chances of getting replies.</p>
          <p className="mt-4 text-center text-sm leading-6 text-charcoal/60">Subscribe to unlock unlimited chats and make more meaningful connections.</p>
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-charcoal/15 px-5 py-3 text-sm font-semibold text-charcoal hover:border-burgundy/30">Maybe later</button>
            <Link to="/membership" onClick={() => setOpen(false)} className="rounded-full bg-burgundy px-5 py-3 text-center text-sm font-semibold text-cream hover:bg-plum">View subscription plans</Link>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
