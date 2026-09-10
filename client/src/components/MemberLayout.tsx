import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Brand from "./Brand";
import { useAuth } from "../context/AuthContext";

const nav = [["/app/discover", "Discover", "⌂"], ["/app/likes", "Likes", "♡"], ["/app/matches", "Matches", "✦"], ["/app/messages", "Chat", "◌"]];

export default function MemberLayout() {
  const { user, signOut } = useAuth(); const navigate = useNavigate();
  async function logout() { await signOut(); navigate("/"); }
  return <div className="min-h-screen bg-cream text-charcoal pb-20 md:pb-0">
    <header className="sticky top-0 z-30 border-b border-charcoal/10 bg-cream/90 backdrop-blur-xl"><div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10"><Link to="/app/discover" aria-label="Sshh... Koi Hai? discover"><Brand className="h-11 w-auto max-w-[155px] object-contain sm:h-14 sm:max-w-[200px]" /></Link><nav className="hidden items-center gap-7 md:flex">{nav.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `text-sm font-medium transition ${isActive ? "text-burgundy" : "text-charcoal/60 hover:text-burgundy"}`}>{label}</NavLink>)}<NavLink to="/app/profile" className={({ isActive }) => `rounded-full border px-4 py-2 text-sm font-semibold ${isActive ? "border-burgundy bg-burgundy text-cream" : "border-charcoal/15 text-charcoal/70"}`}>My profile</NavLink><button onClick={logout} className="text-sm font-semibold text-burgundy">Sign out</button></nav><Link to="/app/profile" aria-label="Open my profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-sm font-semibold text-cream md:hidden">{(user?.displayName || "U").slice(0, 1).toUpperCase()}</Link></div></header>
    <main><Outlet /></main>
    <footer className="hidden border-t border-charcoal/10 bg-plum text-cream md:block"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><p className="text-xs text-cream/50">Private - Secure - 18+ Members Only</p><div className="flex gap-6 text-xs text-cream/60"><Link to="/safety">Safety</Link><Link to="/privacy">Privacy</Link><Link to="/contact">Contact</Link></div></div></footer>
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal/10 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(25,23,27,0.08)] backdrop-blur-xl md:hidden"><div className="mx-auto grid max-w-md grid-cols-5">{nav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${isActive ? "font-semibold text-burgundy" : "text-charcoal/50"}`}><span aria-hidden="true" className="text-xl leading-5">{icon}</span><span className="truncate">{label}</span></NavLink>)}<NavLink to="/app/profile" className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${isActive ? "font-semibold text-burgundy" : "text-charcoal/50"}`}><span aria-hidden="true" className="text-xl leading-5">◎</span><span>Profile</span></NavLink></div></nav>
  </div>;
}
