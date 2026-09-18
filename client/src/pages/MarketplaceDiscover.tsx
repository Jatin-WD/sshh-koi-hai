import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SafetyActions from "../components/SafetyActions";
import { api } from "../lib/api";

type Profile = { id: string; displayName: string; age: number; city: string | null; bio: string | null; interests: string[]; profileImages: string[]; primaryImageIndex: number; onlineStatus?: boolean; canReceiveInterest?: boolean; relationshipIntent?: string | null };
type Filters = { gender: string; minAge: string; maxAge: string; city: string; lookingFor: string };
const empty: Filters = { gender: "", minAge: "", maxAge: "", city: "", lookingFor: "" };
const intentLabels: Record<string, string> = { CHAT: "Conversation", FRIENDSHIP: "Friendship", DATING: "Dating", RELATIONSHIP: "Relationship", MARRIAGE: "Marriage" };

export default function MarketplaceDiscover() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filters, setFilters] = useState<Filters>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [actions, setActions] = useState<Record<string, "sending" | "sent" | "membership">>({});
  const [params, setParams] = useSearchParams();
  const activated = params.get("membership") === "activated";

  async function load(all = showAll, selected = filters) {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: "1", pageSize: "24" });
      if (!all) Object.entries(selected).forEach(([key, value]) => { if (value) query.set(key, value); });
      const result = await api<{ profiles: Profile[] }>(`/discover?${query}`);
      setProfiles(result.profiles);
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to load profiles"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(false, empty); }, []);
  const activeCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);
  function dismissActivation() { params.delete("membership"); setParams(params, { replace: true }); }

  async function sendInterest(profile: Profile) {
    if (profile.canReceiveInterest === false || actions[profile.id]) return;
    setActions((current) => ({ ...current, [profile.id]: "sending" }));
    try { await api("/interests", { method: "POST", body: JSON.stringify({ receiverId: profile.id }) }); setActions((current) => ({ ...current, [profile.id]: "sent" })); }
    catch (value) { const message = value instanceof Error ? value.message : "Unable to send interest"; setActions((current) => ({ ...current, [profile.id]: message.toLowerCase().includes("membership") ? "membership" : undefined } as Record<string, "sending" | "sent" | "membership">)); }
  }

  return <section className="marketplace-shell min-h-[calc(100vh-72px)]"><div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-burgundy/65">Your discovery space</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">Find people who want the same things.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-charcoal/60">Browse compatible profiles, see what matters to them and take the first step when you feel comfortable.</p></div><div className="flex items-center gap-2"><span className="trust-chip">Verified community</span><button type="button" onClick={() => setShowFilters((value) => !value)} className="rounded-full bg-burgundy px-4 py-3 text-sm font-semibold text-cream">{showFilters ? "Hide filters" : "Filters"}{activeCount ? ` (${activeCount})` : ""}</button></div></div>
    {activated && <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-900"><p className="text-sm font-semibold">Membership activated. You can now connect with people.</p><button onClick={dismissActivation} className="text-sm font-semibold underline">Continue exploring</button></div>}
    <div className="mt-8 grid gap-7 lg:grid-cols-[240px_1fr]">
      <aside className={`${showFilters ? "block" : "hidden"} h-fit rounded-2xl border border-charcoal/10 bg-white/85 p-5 lg:block`}><div className="flex items-center justify-between"><h2 className="font-display text-2xl">Refine your search</h2><span className="text-xs text-charcoal/45">{activeCount} active</span></div><div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Looking for<select value={filters.lookingFor} onChange={(e) => setFilters({ ...filters, lookingFor: e.target.value })} className="profile-input"><option value="">Everyone</option><option value="MARRIAGE">Marriage</option><option value="RELATIONSHIP">Relationship</option><option value="DATING">Dating</option><option value="FRIENDSHIP">Friendship</option><option value="CHAT">Conversation</option></select></label><label className="block text-sm font-semibold">Gender<select value={filters.gender} onChange={(e) => setFilters({ ...filters, gender: e.target.value })} className="profile-input"><option value="">Any gender</option><option value="MALE">Men</option><option value="FEMALE">Women</option><option value="NON_BINARY">Non-binary</option></select></label><div className="grid grid-cols-2 gap-2"><label className="text-sm font-semibold">Min age<input type="number" min="18" placeholder="18" value={filters.minAge} onChange={(e) => setFilters({ ...filters, minAge: e.target.value })} className="profile-input" /></label><label className="text-sm font-semibold">Max age<input type="number" max="100" placeholder="60" value={filters.maxAge} onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })} className="profile-input" /></label></div><label className="block text-sm font-semibold">City<input placeholder="e.g. Delhi" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="profile-input" /></label><button onClick={() => { setShowAll(false); void load(false, filters); }} className="w-full rounded-full bg-burgundy px-4 py-3 text-sm font-semibold text-cream">Apply filters</button><button onClick={() => { setFilters(empty); setShowAll(false); void load(false, empty); }} className="w-full rounded-full border border-charcoal/15 px-4 py-3 text-sm font-semibold text-burgundy">Clear all</button></div><div className="mt-6 border-t border-charcoal/10 pt-5 text-xs leading-5 text-charcoal/50">Your preferences help us show more relevant people. You can change them anytime.</div></aside>
      <div><div className="mb-5 flex items-center justify-between"><p className="text-sm font-semibold text-burgundy">{loading ? "Finding compatible people…" : `${profiles.length} people to explore`}</p><span className="text-xs text-charcoal/45">Recommended for you</span></div>{error && <div className="rounded-2xl bg-red-50 p-5 text-sm text-red-800"><p>{error}</p><button onClick={() => void load()} className="mt-3 font-semibold underline">Try again</button></div>}{!loading && !error && !profiles.length && <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-10 text-center"><h2 className="font-display text-3xl">Your perfect search is still growing.</h2><p className="mt-3 text-sm text-charcoal/60">Try widening your filters or check back as new members join.</p><button onClick={() => { setShowAll(true); void load(true); }} className="mt-6 rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-cream">Show everyone</button></div>}{<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{loading ? [1, 2, 3].map((item) => <div key={item} className="skeleton h-[27rem] rounded-2xl" />) : profiles.map((profile) => { const action = actions[profile.id]; const image = profile.profileImages[profile.primaryImageIndex] ?? profile.profileImages[0]; return <article key={profile.id} className="profile-card"><Link to={`/app/profile/${profile.id}`} className="block"><div className="relative aspect-[4/3] bg-plum">{image && <img src={image} alt={`${profile.displayName}'s profile`} className="h-full w-full object-cover" />}{profile.onlineStatus && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-green-700">● Online</span>}<span className="absolute bottom-3 left-3 rounded-full bg-charcoal/75 px-2.5 py-1 text-[11px] font-semibold text-cream">✓ Verified profile</span></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl">{profile.displayName}, {profile.age}</h2><p className="mt-1 text-xs text-charcoal/50">{profile.city ?? "Location private"}</p></div><span className="text-lg text-burgundy">♡</span></div>{profile.relationshipIntent && <p className="mt-4 inline-flex rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-burgundy">{profile.relationshipIntent}</p>}<p className="mt-3 line-clamp-2 text-sm leading-6 text-charcoal/65">{profile.bio || "Looking forward to a genuine conversation."}</p><div className="mt-4 flex flex-wrap gap-1.5">{profile.interests.slice(0, 3).map((interest) => <span key={interest} className="rounded-full bg-cream px-2.5 py-1 text-[11px] text-burgundy">{interest}</span>)}</div></div></Link><div className="flex items-center gap-2 px-5 pb-5"><button disabled={profile.canReceiveInterest === false || Boolean(action)} onClick={() => void sendInterest(profile)} className="flex-1 rounded-full bg-burgundy px-3 py-2.5 text-sm font-semibold text-cream disabled:opacity-60">{action === "sending" ? "Sending…" : action === "sent" ? "Interest sent ✓" : action === "membership" ? "Membership needed" : profile.canReceiveInterest === false ? "Not accepting" : "Send interest"}</button><SafetyActions userId={profile.id} displayName={profile.displayName} onBlocked={() => setProfiles((current) => current.filter((item) => item.id !== profile.id))} /></div></article>; })}</div>}</div>
    </div></div>
  </section>;
}
