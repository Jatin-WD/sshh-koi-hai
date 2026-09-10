import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Brand from "./Brand";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

type IconName = "discover" | "likes" | "matches" | "chat" | "profile";
const nav: Array<[string, string, IconName]> = [["/app/discover", "Find people", "discover"], ["/app/likes", "Likes", "likes"], ["/app/matches", "Matches", "matches"], ["/app/messages", "Chat", "chat"]];

function NavIcon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" {...common}>
    {name === "discover" && <><path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3Z" /><circle cx="12" cy="12" r="1" /></>}
    {name === "likes" && <path d="M20.8 8.7c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6Z" />}
    {name === "matches" && <><circle cx="8.5" cy="8.5" r="3.5" /><circle cx="15.5" cy="15.5" r="3.5" /><path d="m11 11 2 2" /></>}
    {name === "chat" && <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.2-.6L4 20l1.6-3.8A7.2 7.2 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" />}
    {name === "profile" && <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>}
  </svg>;
}

export default function MemberLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  async function logout() { await signOut(); navigate("/"); }
  const mobileNav: Array<[string, string, IconName]> = [...nav, ["/app/profile", "Profile", "profile"]];
  return <div className="min-h-screen bg-cream text-charcoal pb-20 md:pb-0">
    <header className="sticky top-0 z-30 border-b border-charcoal/10 bg-cream/90 backdrop-blur-xl"><div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10"><Link to="/app/discover" aria-label="Sshh... Koi Hai? discover"><Brand className="h-11 w-auto max-w-[130px] object-contain sm:h-14 sm:max-w-[200px]" /></Link><nav className="hidden items-center gap-7 md:flex">{nav.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => `text-sm font-medium transition ${isActive ? "text-burgundy" : "text-charcoal/60 hover:text-burgundy"}`}>{label}</NavLink>)}<NotificationBell /><NavLink to="/app/profile" className={({ isActive }) => `rounded-full border px-4 py-2 text-sm font-semibold ${isActive ? "border-burgundy bg-burgundy text-cream" : "border-charcoal/15 text-charcoal/70"}`}>My profile</NavLink><button type="button" onClick={() => void logout()} className="text-sm font-semibold text-burgundy">Sign out</button></nav><div className="flex items-center gap-1.5 md:hidden"><NotificationBell /><Link to="/app/profile" aria-label="Open my profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy text-sm font-semibold text-cream">{(user?.displayName || "U").slice(0, 1).toUpperCase()}</Link><button type="button" onClick={() => void logout()} className="rounded-full px-2 py-2 text-xs font-semibold text-burgundy" aria-label="Sign out">Sign out</button></div></div></header>
    <main><Outlet /></main>
    <footer className="hidden border-t border-charcoal/10 bg-plum text-cream md:block"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10"><p className="text-xs text-cream/50">Private - Secure - 18+ Members Only</p><div className="flex gap-6 text-xs text-cream/60"><Link to="/safety">Safety</Link><Link to="/privacy">Privacy</Link><Link to="/contact">Contact</Link></div></div></footer>
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal/10 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(25,23,27,0.08)] backdrop-blur-xl md:hidden"><div className="mx-auto grid max-w-md grid-cols-5">{mobileNav.map(([to, label, icon]) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] ${isActive ? "font-semibold text-burgundy" : "text-charcoal/50"}`}><span className="leading-5"><NavIcon name={icon} /></span><span className="truncate">{label}</span></NavLink>)}</div></nav>
  </div>;
}
