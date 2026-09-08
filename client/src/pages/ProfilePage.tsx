import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type Profile = {
  id: string;
  displayName: string;
  age: number;
  gender: string;
  city: string | null;
  maritalStatus: string | null;
  lookingFor: string | null;
  bio: string | null;
  interests: string[];
  profileImages: string[];
  primaryImageIndex: number;
  occupation: string | null;
  education: string | null;
  languages: string[];
  relationshipIntent: string | null;
  genderPreference?: string | null;
  agePreferenceMin?: number | null;
  agePreferenceMax?: number | null;
  locationPreference?: string | null;
  visibility: "VISIBLE" | "HIDDEN";
  showOnlineStatus?: boolean;
  showCity?: boolean;
  allowInterests?: boolean;
};

const inputClass = "profile-input mt-2";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completion, setCompletion] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  useEffect(() => {
    api<{ profile: Profile; completion: number }>("/profile/me")
      .then((data) => { setProfile(data.profile); setCompletion(data.completion); })
      .catch((e) => setError(e instanceof Error ? e.message : "Unable to load profile"));
  }, []);

  if (!profile) return <section className="mx-auto max-w-5xl px-6 py-16"><p>{error || "Loading your profile..."}</p></section>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const numberOrNull = (value: FormDataEntryValue | undefined) => {
      const parsed = Number(value);
      return value && String(value).trim() ? parsed : null;
    };
    const payload = {
      ...data,
      city: String(data.city ?? "").trim() || null,
      occupation: String(data.occupation ?? "").trim() || null,
      education: String(data.education ?? "").trim() || null,
      bio: String(data.bio ?? "").trim() || null,
      relationshipIntent: String(data.relationshipIntent ?? "").trim() || null,
      genderPreference: String(data.genderPreference ?? "") || null,
      locationPreference: String(data.locationPreference ?? "").trim() || null,
      agePreferenceMin: numberOrNull(data.agePreferenceMin),
      agePreferenceMax: numberOrNull(data.agePreferenceMax),
      interests: String(data.interests ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      languages: String(data.languages ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      showOnlineStatus: data.showOnlineStatus === "on",
      showCity: data.showCity === "on",
      allowInterests: data.allowInterests === "on",
    };
    try {
      const result = await api<{ profile: Profile; completion: number; visibilityNotice?: string }>("/profile/me", { method: "PUT", body: JSON.stringify(payload) });
      setProfile(result.profile); setCompletion(result.completion); setFormVersion((value) => value + 1);
      setNotice(result.visibilityNotice ?? "Your profile has been saved.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save profile"); }
    finally { setSaving(false); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setNotice(""); setUploading(true);
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024) { setUploading(false); setError("Choose a JPG, PNG, or WebP image under 8MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") { setUploading(false); setError("The selected image could not be read. Please try another file."); return; }
      try {
        const result = await api<{ profileImages: string[]; primaryImageIndex: number }>("/profile/images", { method: "POST", body: JSON.stringify({ imageData: reader.result }) });
        setProfile({ ...profile, profileImages: result.profileImages, primaryImageIndex: result.primaryImageIndex }); setNotice("Photo added to your profile.");
      } catch (e) { setError(e instanceof Error ? e.message : "Unable to upload image"); }
      finally { setUploading(false); }
    };
    reader.onerror = () => { setUploading(false); setError("The selected image could not be read. Please try another file."); };
    reader.readAsDataURL(file); event.target.value = "";
  }

  async function removeImage(index: number) {
    try { const result = await api<{ profileImages: string[]; primaryImageIndex: number }>(`/profile/images/${index}`, { method: "DELETE" }); setProfile({ ...profile, profileImages: result.profileImages, primaryImageIndex: result.primaryImageIndex }); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to remove image"); }
  }

  async function makePrimary(index: number) {
    try { await api(`/profile/images/${index}/primary`, { method: "PATCH" }); setProfile({ ...profile, primaryImageIndex: index }); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to set primary image"); }
  }

  async function deleteAccount() {
    if (window.prompt("Type DELETE to permanently close your account") !== "DELETE") return;
    try { await api("/profile/me", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }); window.location.href = "/"; }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to delete account"); }
  }

  return <section className="mx-auto max-w-6xl px-6 py-12">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div><Link to="/account" className="text-sm text-burgundy underline">← Back to your space</Link><p className="mt-6 text-xs uppercase tracking-[0.3em] text-burgundy/65">Profile editor</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">Tell people what makes you, you.</h1><p className="mt-3 max-w-2xl text-charcoal/65">Build a thoughtful introduction with your interests, intentions, preferences, and the photos you want people to see.</p></div>
      <div className="min-w-44 rounded-2xl border border-burgundy/10 bg-white/70 p-4"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-burgundy/65">Profile strength</span><span className="font-display text-2xl text-burgundy">{completion}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-charcoal/10"><div className="h-full rounded-full bg-gold" style={{ width: `${completion}%` }} /></div><p className="mt-2 text-xs text-charcoal/55">{profile.visibility === "VISIBLE" ? "Visible to members" : "Private until complete"}</p></div>
    </div>

    {(error || notice) && <p className={`mb-6 rounded-2xl p-4 text-sm ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{error || notice}</p>}

    <div className="grid gap-8 lg:grid-cols-[1.35fr_.65fr]">
      <form key={formVersion} onSubmit={save} className="space-y-6">
        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">01 · About you</p><h2 className="mt-2 font-display text-3xl">The basics people notice first.</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm">Display name<input name="displayName" defaultValue={profile.displayName} className={inputClass} required /></label>
            <label className="text-sm">City<input name="city" defaultValue={profile.city ?? ""} placeholder="Where are you based?" className={inputClass} /></label>
            <label className="text-sm">Gender<select name="gender" defaultValue={profile.gender} className={inputClass}><option value="MALE">Man</option><option value="FEMALE">Woman</option><option value="NON_BINARY">Non-binary</option><option value="OTHER">Prefer to self-describe</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
            <label className="text-sm">Marital status<select name="maritalStatus" defaultValue={profile.maritalStatus ?? "SINGLE"} className={inputClass}><option value="SINGLE">Single</option><option value="MARRIED">Married</option><option value="DIVORCED">Divorced</option><option value="WIDOWED">Widowed</option><option value="SEPARATED">Separated</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
            <label className="text-sm">Work / occupation<input name="occupation" defaultValue={profile.occupation ?? ""} placeholder="What do you do?" className={inputClass} /></label>
            <label className="text-sm">Education<input name="education" defaultValue={profile.education ?? ""} placeholder="Study or qualification" className={inputClass} /></label>
          </div>
          <label className="mt-5 block text-sm">Languages <span className="text-charcoal/45">comma separated</span><input name="languages" defaultValue={profile.languages.join(", ")} placeholder="Hindi, English" className={inputClass} /></label>
        </div>

        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">02 · Your personality</p><h2 className="mt-2 font-display text-3xl">Give someone an easy opening line.</h2>
          <label className="mt-6 block text-sm">About you<textarea name="bio" defaultValue={profile.bio ?? ""} rows={5} maxLength={1000} placeholder="What are you like? What does a good conversation feel like for you?" className={inputClass} /></label>
          <label className="mt-5 block text-sm">What do you enjoy? <span className="text-charcoal/45">comma separated</span><input name="interests" defaultValue={profile.interests.join(", ")} placeholder="Music, travel, books, food" className={inputClass} /></label>
          <label className="mt-5 block text-sm">What are you hoping to find?<input name="relationshipIntent" defaultValue={profile.relationshipIntent ?? ""} placeholder="A meaningful relationship, new people, honest conversation..." className={inputClass} /></label>
        </div>

        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">03 · Your preferences</p><h2 className="mt-2 font-display text-3xl">Be clear about what you want.</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm">I am here for<select name="lookingFor" defaultValue={profile.lookingFor ?? "CHAT"} className={inputClass}><option value="CHAT">Private conversation</option><option value="DATING">Dating</option><option value="RELATIONSHIP">A relationship</option><option value="MARRIAGE">Marriage</option><option value="FRIENDSHIP">Friendship</option></select></label>
            <label className="text-sm">Interested in<select name="genderPreference" defaultValue={profile.genderPreference ?? ""} className={inputClass}><option value="">Any gender</option><option value="MALE">Men</option><option value="FEMALE">Women</option><option value="NON_BINARY">Non-binary people</option><option value="OTHER">Self-described people</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
            <label className="text-sm">Preferred age from<input name="agePreferenceMin" type="number" min="18" max="100" defaultValue={profile.agePreferenceMin ?? ""} placeholder="18" className={inputClass} /></label>
            <label className="text-sm">Preferred age to<input name="agePreferenceMax" type="number" min="18" max="100" defaultValue={profile.agePreferenceMax ?? ""} placeholder="60" className={inputClass} /></label>
          </div>
          <label className="mt-5 block text-sm">Preferred location<input name="locationPreference" defaultValue={profile.locationPreference ?? ""} placeholder="Delhi, nearby cities, or anywhere" className={inputClass} /></label>
        </div>

        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-7 shadow-soft">
          <p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">04 · Privacy</p><h2 className="mt-2 font-display text-3xl">You stay in control.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm">Profile visibility<select name="visibility" defaultValue={profile.visibility} className={inputClass}><option value="VISIBLE">Visible when complete</option><option value="HIDDEN">Keep hidden</option></select></label></div>
          <div className="mt-6 space-y-3">{[["showOnlineStatus", "Show when I am online"], ["showCity", "Show my city"], ["allowInterests", "Allow members to send interests"]].map(([name, label]) => <label key={name} className="flex gap-3 text-sm"><input name={name} type="checkbox" defaultChecked={profile[name as keyof Profile] as boolean | undefined} className="mt-1 accent-burgundy" />{label}</label>)}</div>
          <button disabled={saving} className="mt-7 rounded-full bg-burgundy px-7 py-3 text-sm font-semibold text-cream disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button>
        </div>
      </form>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-burgundy/10 bg-plum p-7 text-cream shadow-soft"><p className="text-xs uppercase tracking-[0.25em] text-gold">Profile preview</p><div className="mt-6 flex h-64 items-end rounded-2xl bg-gradient-to-br from-rose/70 via-burgundy to-charcoal p-4">{profile.profileImages[profile.primaryImageIndex] ? <img src={profile.profileImages[profile.primaryImageIndex]} alt="Your selected profile" className="h-full w-full rounded-xl object-cover" /> : <p className="font-display text-2xl text-cream/70">Add your first photo.</p>}</div><h2 className="mt-5 font-display text-3xl">{profile.displayName}, {profile.age}</h2><p className="mt-2 text-sm text-cream/60">{profile.city || "City private"} · {profile.lookingFor || "Open to discovery"}</p><p className="mt-4 text-sm leading-6 text-cream/65">{profile.bio || "Your introduction will appear here."}</p>{profile.interests.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{profile.interests.slice(0, 6).map((interest) => <span key={interest} className="rounded-full border border-cream/20 px-3 py-1 text-xs text-cream/75">{interest}</span>)}</div>}</div>

        <div className="rounded-3xl border border-charcoal/10 bg-white/80 p-7 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">Photo gallery</p><p className="mt-1 text-sm text-charcoal/55">{profile.profileImages.length} of 6 photos</p></div>{profile.profileImages.length < 6 && <label className={`rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-cream ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>{uploading ? "Uploading..." : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} className="hidden" /></label>}</div><div className="mt-5 grid grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, index) => { const image = profile.profileImages[index]; return <div key={index} className="relative aspect-square">{image ? <><img src={image} alt={`Profile ${index + 1}`} className={`h-full w-full rounded-xl object-cover ${index === profile.primaryImageIndex ? "ring-2 ring-gold" : ""}`} /><button type="button" onClick={() => makePrimary(index)} className="absolute bottom-1 left-1 rounded bg-charcoal/75 px-1.5 py-1 text-[10px] text-white">{index === profile.primaryImageIndex ? "Primary" : "Set primary"}</button><button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded bg-charcoal/75 px-1.5 py-1 text-[10px] text-white">Remove</button></> : <label className={`flex h-full items-center justify-center rounded-xl border border-dashed border-charcoal/15 bg-cream/50 text-center text-xs text-charcoal/45 ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>+ Add photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} className="hidden" /></label>}</div>; })}</div><p className="mt-4 text-xs leading-5 text-charcoal/50">Use clear, recent photos. JPG, PNG, or WebP, maximum 8MB each.</p></div>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-7"><p className="text-xs uppercase tracking-[0.25em] text-red-700">Account settings</p><p className="mt-3 text-sm leading-6 text-red-900/70">Closing your account removes your profile and signs you out. This cannot be undone.</p><button type="button" onClick={deleteAccount} className="mt-5 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800">Delete account</button></div>
      </aside>
    </div>
  </section>;
}
