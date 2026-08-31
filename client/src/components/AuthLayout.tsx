import { Link, Outlet } from "react-router-dom";
import { clientEnv } from "../env";

export default function AuthLayout() {
  return <div className="min-h-screen bg-cream text-charcoal"><header className="border-b border-charcoal/10 bg-cream/90"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link to="/" className="font-display text-2xl text-burgundy">{clientEnv.VITE_APP_NAME}</Link><span className="text-xs uppercase tracking-[0.25em] text-charcoal/55">Private space</span></div></header><main><Outlet /></main></div>;
}
