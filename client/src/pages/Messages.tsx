import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import SafetyActions from "../components/SafetyActions";
import { useAuth } from "../context/AuthContext";
import { clientEnv } from "../env";
import { api } from "../lib/api";

type Message = { id: string; conversationId: string; senderId: string; content: string; type: "TEXT" | "IMAGE"; createdAt: string; deliveredAt: string | null; readAt: string | null };
type Conversation = { id: string; unreadCount: number; latestMessage: Message | null; participant: { id: string; displayName: string; age: number; city: string | null; profileImages: string[]; primaryImageIndex: number } };
const socketUrl = clientEnv.VITE_API_BASE_URL.replace(/\/api\/?$/, "");

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { conversationId: routeId } = useParams();
  const [query] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState(routeId ?? query.get("conversationId") ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [status, setStatus] = useState("Connecting...");
  const [error, setError] = useState("");
  const [membershipRequired, setMembershipRequired] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingDraftRef = useRef("");

  function handleError(value: unknown) { const message = value instanceof Error ? value.message : "Chat action failed"; if (message.toLowerCase().includes("membership")) setMembershipRequired(true); else setError(message); }
  async function loadConversations() { try { const data = await api<{ conversations: Conversation[] }>("/conversations"); setConversations(data.conversations); if (!selectedId && data.conversations[0]) setSelectedId(data.conversations[0].id); } catch (value) { handleError(value); } finally { setLoading(false); } }
  async function loadMessages(id: string) { try { const data = await api<{ messages: Message[] }>(`/conversations/${id}/messages?page=1&pageSize=50`); setMessages(data.messages); } catch (value) { handleError(value); } }

  useEffect(() => {
    void loadConversations();
    const socket = io(socketUrl, { withCredentials: true, reconnection: true, reconnectionAttempts: 3, reconnectionDelay: 2000, reconnectionDelayMax: 10000, timeout: 5000 }); socketRef.current = socket;
    socket.on("connect", () => { setStatus("Private connection active"); if (selectedId) socket.emit("conversation:join", { conversationId: selectedId }); });
    socket.on("disconnect", () => setStatus("Offline - reconnecting")); socket.on("connect_error", () => setStatus("Unable to connect privately"));
    socket.on("message:new", (message: Message) => { setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); if (message.senderId === user?.id) { pendingDraftRef.current = ""; setDraft(""); setSending(false); } else socket.emit("message:read", { conversationId: message.conversationId, messageId: message.id }); void loadConversations(); });
    socket.on("message:read", ({ messageId, readAt }: { messageId: string; readAt: string }) => setMessages((current) => current.map((message) => message.id === messageId ? { ...message, readAt } : message)));
    socket.on("messages:delivered", ({ messageIds, deliveredAt }: { messageIds: string[]; deliveredAt: string }) => setMessages((current) => current.map((message) => messageIds.includes(message.id) ? { ...message, deliveredAt } : message)));
    socket.on("conversation:typing", ({ typing: isTyping }: { typing: boolean }) => setTyping(isTyping));
    socket.on("chat:error", ({ message, code }: { message: string; code?: string }) => { if (code === "MEMBERSHIP_REQUIRED") setMembershipRequired(true); else setError(message); if (pendingDraftRef.current) setDraft(pendingDraftRef.current); setSending(false); });
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [user?.id]);
  useEffect(() => { if (!selectedId) return; setError(""); void loadMessages(selectedId); socketRef.current?.emit("conversation:join", { conversationId: selectedId }); }, [selectedId]);
  useEffect(() => { const nextId = routeId ?? query.get("conversationId") ?? ""; if (nextId && nextId !== selectedId && selectedId) setSelectedId(nextId); }, [routeId, query, selectedId]);
  useEffect(() => { if (!selectedId && (routeId || query.get("conversationId"))) navigate("/app/messages", { replace: true }); }, [selectedId, routeId, query, navigate]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  function sendMessage(event: FormEvent) { event.preventDefault(); const content = draft.trim(); if (!content || !selectedId || !socketRef.current?.connected || sending) return; pendingDraftRef.current = content; setSending(true); socketRef.current.emit("message:send", { conversationId: selectedId, content, type: "TEXT" }); socketRef.current.emit("conversation:typing", { conversationId: selectedId, typing: false }); setTimeout(() => setSending(false), 5000); }
  function changeDraft(value: string) { setDraft(value); if (selectedId) socketRef.current?.emit("conversation:typing", { conversationId: selectedId, typing: value.length > 0 }); }
  const selected = conversations.find((conversation) => conversation.id === selectedId);

  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10"><div className="mb-6"><p className="eyebrow text-burgundy/65">Private messages</p><h1 className="mt-3 font-display text-4xl sm:text-5xl">A conversation of your own.</h1><p className="mt-3 text-sm text-charcoal/60">{status}</p></div>
    {membershipRequired && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-5"><div><p className="font-semibold text-burgundy">Membership opens private conversations.</p><p className="mt-1 text-sm text-charcoal/60">Profiles and discovery remain free. Subscribe to chat after a mutual connection.</p></div><Link to="/membership" className="rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-cream">Explore membership</Link></div>}
    {error && <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p>{error}</p><button onClick={() => { setError(""); if (selectedId) void loadMessages(selectedId); else void loadConversations(); }} className="mt-2 font-semibold underline">Try again</button></div>}
    <div className="grid min-h-[560px] overflow-hidden rounded-3xl border border-charcoal/10 bg-white/70 shadow-soft md:grid-cols-[300px_1fr]"><aside className={`border-b border-charcoal/10 md:border-b-0 md:border-r ${selected ? "hidden md:block" : "block"}`}><div className="border-b border-charcoal/10 p-5"><p className="eyebrow text-burgundy/65">Conversations</p><p className="mt-1 text-xs text-charcoal/50">Mutual connections appear here.</p></div>{loading && <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="skeleton h-16 rounded-2xl" />)}</div>}{!loading && !conversations.length && <div className="p-6 text-center"><p className="font-display text-2xl">Nothing here yet.</p><p className="mt-2 text-sm leading-6 text-charcoal/55">Find someone interesting and show a little interest first.</p><Link to="/app/discover" className="mt-5 inline-flex rounded-full bg-burgundy px-4 py-2.5 text-sm font-semibold text-cream">Find people</Link></div>}{conversations.map((conversation) => <button key={conversation.id} onClick={() => { setSelectedId(conversation.id); navigate(`/app/messages/${conversation.id}`); }} className={`flex min-h-[76px] w-full gap-3 border-b border-charcoal/10 p-4 text-left ${selectedId === conversation.id ? "bg-cream" : "hover:bg-cream/60"}`}><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-rose to-burgundy">{conversation.participant.profileImages[conversation.participant.primaryImageIndex] && <img src={conversation.participant.profileImages[conversation.participant.primaryImageIndex]} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="font-display text-lg">{conversation.participant.displayName}</p><p className="truncate text-xs text-charcoal/50">{conversation.latestMessage?.content ?? "A new conversation"}</p></div>{conversation.unreadCount > 0 && <span className="ml-auto h-5 min-w-5 rounded-full bg-burgundy px-1.5 text-center text-xs leading-5 text-cream">{conversation.unreadCount}</span>}</button>)}</aside>
      <main className={`flex min-h-[560px] flex-col ${!selected ? "hidden md:flex" : "flex"}`}>{selected ? <><header className="flex flex-wrap items-center gap-3 border-b border-charcoal/10 p-4 sm:p-5"><button type="button" onClick={() => setSelectedId("")} className="rounded-full border border-charcoal/15 px-3 py-2 text-sm md:hidden" aria-label="Back to conversations">Back</button><div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-rose to-burgundy">{selected.participant.profileImages[selected.participant.primaryImageIndex] && <img src={selected.participant.profileImages[selected.participant.primaryImageIndex]} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><h2 className="font-display text-2xl">{selected.participant.displayName}, {selected.participant.age}</h2><p className="text-xs text-charcoal/50">{selected.participant.city ?? "Location private"}</p></div><SafetyActions userId={selected.participant.id} displayName={selected.participant.displayName} onBlocked={() => { setConversations((current) => current.filter((conversation) => conversation.id !== selected.id)); setSelectedId(""); navigate("/app/messages", { replace: true }); }} /></header><div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">{!messages.length && <p className="py-10 text-center text-sm text-charcoal/50">Start gently. A good conversation does not need a perfect opening.</p>}{messages.map((message) => { const own = message.senderId === user?.id; return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${own ? "rounded-br-sm bg-burgundy text-cream" : "rounded-bl-sm bg-cream text-charcoal"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p><p className={`mt-2 text-[10px] ${own ? "text-cream/50" : "text-charcoal/45"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{own && ` - ${message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}`}</p></div></div>; })}{typing && <p className="text-xs italic text-charcoal/45">{selected.participant.displayName} is typing...</p>}<div ref={bottomRef} /></div><div className="border-t border-charcoal/10 p-3 sm:p-4"><p className="mb-2 text-center text-[11px] text-charcoal/45">Keep personal details private until you feel comfortable.</p><form onSubmit={sendMessage} className="flex gap-2 sm:gap-3"><input aria-label="Message" value={draft} onChange={(event) => changeDraft(event.target.value)} placeholder="Write something private..." maxLength={4000} className="profile-input" /><button disabled={sending || !draft.trim()} className="rounded-full bg-burgundy px-4 py-3 text-sm font-semibold text-cream disabled:opacity-50">{sending ? "Sending..." : "Send"}</button></form></div></> : <div className="flex flex-1 items-center justify-center p-10 text-center"><div><p className="font-display text-3xl">Choose a conversation.</p><p className="mt-3 text-sm text-charcoal/60">When a mutual connection is ready, your private conversation will appear here.</p></div></div>}</main></div>
  </section>;
}
