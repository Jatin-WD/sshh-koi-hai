import { Link, Outlet } from "react-router-dom";
import Brand from "./Brand";

export default function AuthLayout() {
  return <div className="min-h-screen bg-cream text-charcoal"><header className="border-b border-charcoal/10 bg-cream/90"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link to="/" aria-label="Sshh... Koi Hai? home"><Brand className="h-14 w-auto max-w-[210px] object-contain" /></Link><span className="text-xs uppercase tracking-[0.25em] text-charcoal/55">Private space</span></div></header><main><Outlet /></main></div>;
}
