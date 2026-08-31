import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  async function logout() { await signOut(); navigate("/"); }
  return <section className="mx-auto max-w-4xl px-6 py-16"><div className="rounded-[2rem] bg-white/80 p-8 shadow-soft"><p className="text-xs uppercase tracking-[0.3em] text-burgundy/65">Your private space</p><h1 className="mt-3 font-display text-4xl">Welcome, {user?.displayName}</h1><p className="mt-5 text-charcoal/70">Your email is verified. Build an introduction that feels like you, then choose when to be seen.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/profile" className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-cream">Edit profile</Link><Link to="/membership" className="rounded-full border border-charcoal/15 px-5 py-3 text-sm font-semibold">View membership</Link>{user?.role === "ADMIN" && <Link to="/admin" className="rounded-full border border-gold/50 px-5 py-3 text-sm font-semibold text-burgundy">Admin panel</Link>}<button onClick={logout} className="rounded-full border border-burgundy/25 px-5 py-3 text-sm font-semibold text-burgundy">Sign out</button></div></div></section>;
}
