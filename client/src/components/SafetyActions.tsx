import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/api";

const categories = ["Harassment", "Fake Profile", "Spam", "Inappropriate Content", "Scam/Fraud", "Impersonation", "Other"];
type Modal = "block" | "report" | null;

export default function SafetyActions({ userId, displayName, onBlocked }: { userId: string; displayName: string; onBlocked: () => void }) {
  const [modal, setModal] = useState<Modal>(null);
  const [category, setCategory] = useState(categories[0]);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);

  function close() {
    if (busy) return;
    setModal(null);
    setError("");
  }

  useEffect(() => {
    if (!modal) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") close(); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, busy]);

  useEffect(() => {
    if (!modal || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button, input, select, textarea, [href], [tabindex]:not([tabindex=\"-1\"])"));
    focusable()[0]?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    dialog.addEventListener("keydown", trapFocus);
    return () => dialog.removeEventListener("keydown", trapFocus);
  }, [modal]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !modal) return;
    setBusy(true);
    setError("");
    try {
      if (modal === "block") {
        await api(`/users/${userId}/block`, { method: "POST", body: JSON.stringify({}) });
        onBlocked();
      } else {
        await api(`/users/${userId}/report`, { method: "POST", body: JSON.stringify({ category, ...(details ? { details } : {}) }) });
        setModal(null);
        setDetails("");
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Safety action failed");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="mt-5 flex gap-3">
      <button type="button" onClick={() => { setError(""); setModal("block"); }} className="text-xs text-charcoal/50 underline">Block</button>
      <button type="button" onClick={() => { setError(""); setModal("report"); }} className="text-xs text-charcoal/50 underline">Report</button>
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <form ref={dialogRef} onSubmit={submit} className="w-full max-w-md rounded-3xl bg-cream p-7 shadow-soft" role="dialog" aria-modal="true" aria-labelledby="safety-dialog-title">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-burgundy/65">Safety first</p><h2 id="safety-dialog-title" className="mt-3 font-display text-3xl">{modal === "block" ? `Block ${displayName}?` : `Report ${displayName}`}</h2></div><button type="button" onClick={close} disabled={busy} className="rounded-full border border-charcoal/15 px-3 py-1.5 text-sm" aria-label="Close safety dialog">Close</button></div>
        {modal === "block" ? <p className="mt-4 text-sm leading-6 text-charcoal/65">They will disappear from discovery and will not be able to start new interactions or chat with you. Existing conversation history is retained privately.</p> : <><label className="mt-5 block text-sm">Reason<select aria-label="Report reason" value={category} onChange={(event) => setCategory(event.target.value)} className="profile-input">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-4 block text-sm">Details <span className="text-charcoal/45">optional</span><textarea aria-label="Report details" value={details} onChange={(event) => setDetails(event.target.value)} rows={4} maxLength={2000} className="profile-input" placeholder="Tell us what happened." /></label></>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} disabled={busy} className="rounded-full border border-charcoal/15 px-4 py-2.5 text-sm">Cancel</button><button disabled={busy} className="rounded-full bg-burgundy px-4 py-2.5 text-sm font-semibold text-cream">{busy ? "Sending..." : modal === "block" ? "Block user" : "Send report"}</button></div>
      </form>
    </div>}
  </>;
}
