import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

type Notice = { id: string; title: string; body: string; readAt: string | null; type: string; metadata?: { conversationId?: string } | null };

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ notifications: Notice[]; unreadCount: number }>("/notifications?pageSize=6")
      .then((result) => { setItems(result.notifications); setUnread(result.unreadCount); })
      .catch((value) => setError(value instanceof Error ? value.message : "Unable to load notifications"));
  }, [user]);

  if (!user) return null;

  async function markRead(id: string) {
    const item = items.find((notice) => notice.id === id);
    if (!item || saving) return false;
    if (item.readAt) return true;
    setSaving(true); setError("");
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((current) => current.map((notice) => notice.id === id ? { ...notice, readAt: new Date().toISOString() } : notice));
      setUnread((current) => Math.max(0, current - 1));
      return true;
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to update notification"); return false; }
    finally { setSaving(false); }
  }

  async function openNotice(item: Notice) {
    if (!(await markRead(item.id))) return;
    const destination = item.type === "INTEREST_RECEIVED" || item.type === "INTEREST_ACCEPTED"
      ? "/app/likes"
      : item.type === "NEW_MATCH"
        ? "/app/matches"
        : item.type === "NEW_MESSAGE"
          ? item.metadata?.conversationId ? `/app/messages/${item.metadata.conversationId}` : "/app/messages"
          : item.type === "SUBSCRIPTION_EXPIRING" || item.type === "SUBSCRIPTION_EXPIRED"
            ? "/settings/membership"
            : "/settings/account";
    setOpen(false);
    navigate(destination);
  }

  async function markAllRead() {
    if (!unread || saving) return;
    setSaving(true); setError("");
    try {
      await api("/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((notice) => ({ ...notice, readAt: notice.readAt ?? new Date().toISOString() })));
      setUnread(0);
    } catch (value) { setError(value instanceof Error ? value.message : "Unable to update notifications"); }
    finally { setSaving(false); }
  }

  return <div className="relative">
    <button type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} aria-controls="notification-menu" onClick={() => { setOpen((value) => !value); setError(""); }} className="relative rounded-full border border-charcoal/15 px-3 py-2 text-sm">Bell{unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-burgundy px-1 text-center text-[10px] leading-5 text-cream">{unread > 9 ? "9+" : unread}</span>}</button>
    {open && <div id="notification-menu" role="region" aria-label="Notifications" className="absolute right-0 z-30 mt-3 w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-charcoal/10 bg-cream p-3 shadow-soft"><div className="flex items-center justify-between px-2 pb-2"><strong>Notifications</strong><button type="button" disabled={!unread || saving} className="text-xs text-burgundy disabled:opacity-40" onClick={() => void markAllRead()}>{saving ? "Updating..." : "Mark all read"}</button></div>{error && <p role="alert" className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}{items.length ? items.map((item) => <button type="button" key={item.id} disabled={saving} onClick={() => void openNotice(item)} className={`block w-full rounded-xl p-2 text-left text-sm ${item.readAt ? "opacity-60" : "bg-white"}`}><strong>{item.title}</strong><span className="mt-1 block text-xs text-charcoal/65">{item.body}</span></button>) : <p className="p-3 text-sm text-charcoal/60">Nothing new.</p>}<Link to="/notifications" onClick={() => setOpen(false)} className="mt-2 block border-t border-charcoal/10 p-2 pt-3 text-center text-xs font-semibold text-burgundy">View all notifications</Link></div>}
  </div>;
}
