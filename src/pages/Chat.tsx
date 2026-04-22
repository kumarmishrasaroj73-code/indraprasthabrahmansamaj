import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  MessageCircle, Search, Plus, ArrowLeft, Send, Check, CheckCheck, Users, Smile,
  Paperclip, Mic, X, Reply, Trash2, Star, Pin, Copy, Image as ImageIcon, FileText, Play, Pause, Download, MoreVertical, StarOff,
  BarChart3, Megaphone, Info,
} from "lucide-react";
import { PollCard, type Poll } from "@/components/chat/PollCard";
import { CreatePollDialog } from "@/components/chat/CreatePollDialog";
import { GroupInfoDialog } from "@/components/chat/GroupInfoDialog";
import { Switch } from "@/components/ui/switch";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { format, isToday, isYesterday, isSameDay, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// ---------- types ----------
type Profile = { display_name: string | null; avatar_url: string | null };
type Conversation = {
  id: string; is_group: boolean; is_broadcast?: boolean; title: string | null; avatar_url: string | null;
  last_message_at: string;
  participants?: Participant[]; lastMessage?: Message | null; unread?: number;
  displayName?: string; displayAvatar?: string | null;
};
type Participant = {
  id: string; conversation_id: string; user_id: string;
  is_admin: boolean; last_read_at: string; profile?: Profile;
};
type Message = {
  id: string; conversation_id: string; sender_id: string;
  body: string | null; message_type: string; created_at: string;
  edited_at: string | null; deleted_at: string | null;
  media_url: string | null; media_mime: string | null; media_name: string | null;
  media_size: number | null; media_duration_ms: number | null; media_thumbnail: string | null;
  reply_to_id: string | null; is_pinned: boolean;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type Member = { id: string; full_name: string; email: string | null; city: string | null };

// ---------- helpers ----------
const initials = (n?: string | null) =>
  (n || "??").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const dayLabel = (d: Date) =>
  isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEE, dd MMM");
const fmtSize = (b: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};
const fmtMs = (ms: number | null) => {
  if (!ms) return "0:00";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};
const QUICK_EMOJI = ["❤️", "👍", "🙏", "🔥", "😂", "😮", "😢"];

// signed-url cache so we don't re-issue per render
const signedCache = new Map<string, { url: string; exp: number }>();
const getSignedUrl = async (path: string): Promise<string | null> => {
  if (!path) return null;
  const hit = signedCache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
  if (data?.signedUrl) {
    signedCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }
  return null;
};

// ---------- main ----------
const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showMobile, setShowMobile] = useState<"list" | "chat">("list");
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("is_approved_member", { _user_id: user.id });
      setApproved(Boolean(data));
    })();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from("chat_participants").select("conversation_id, last_read_at").eq("user_id", user.id);
    const convIds = (parts ?? []).map((p) => p.conversation_id);
    if (convIds.length === 0) { setConversations([]); return; }

    const { data: convs } = await supabase
      .from("chat_conversations").select("*").in("id", convIds).order("last_message_at", { ascending: false });
    const { data: allParts } = await supabase
      .from("chat_participants").select("*").in("conversation_id", convIds);
    const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
    const { data: msgs } = await supabase
      .from("chat_messages").select("*").in("conversation_id", convIds).order("created_at", { ascending: false });
    const lastByConv = new Map<string, Message>();
    msgs?.forEach((m: any) => { if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m); });

    const myReadByConv = new Map<string, string>();
    parts?.forEach((p) => myReadByConv.set(p.conversation_id, p.last_read_at));

    const enriched: Conversation[] = (convs ?? []).map((c: any) => {
      const cParts = (allParts ?? []).filter((p) => p.conversation_id === c.id).map((p: any) => ({
        ...p, profile: profileMap.get(p.user_id) ?? undefined,
      })) as Participant[];
      const other = cParts.find((p) => p.user_id !== user.id);
      const displayName = c.is_group ? (c.title || "Group") : (other?.profile?.display_name || "Member");
      const displayAvatar = c.is_group ? c.avatar_url : (other?.profile?.avatar_url ?? null);
      const lastMessage = lastByConv.get(c.id) ?? null;
      const lastRead = myReadByConv.get(c.id);
      const unread = (msgs ?? []).filter(
        (m: any) => m.conversation_id === c.id && m.sender_id !== user.id && (!lastRead || m.created_at > lastRead)
      ).length;
      return { ...c, participants: cParts, lastMessage, unread, displayName, displayAvatar };
    });
    setConversations(enriched);
  };

  useEffect(() => { if (user) loadConversations(); }, [user]);
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (approved === false) {
    return (
      <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <MessageCircle className="h-12 w-12 mx-auto text-primary mb-3" />
          <h1 className="font-serif text-2xl font-bold text-secondary mb-2">Members-only chat</h1>
          <p className="text-muted-foreground text-sm">
            केवल अनुमोदित सदस्य ही समाज चैट का उपयोग कर सकते हैं।
            कृपया <a href="/register" className="text-primary underline">पंजीकरण</a> करें।
          </p>
        </div>
      </div>
    );
  }
  if (approved === null) return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>;

  const filtered = conversations.filter((c) =>
    !search || (c.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="container py-4 md:py-6">
      <div className="grid md:grid-cols-[340px_1fr] gap-0 md:gap-4 h-[calc(100vh-9rem)] rounded-2xl overflow-hidden border border-accent/30 shadow-warm bg-card">
        <aside className={`flex flex-col border-r border-accent/30 bg-gradient-warm ${showMobile === "chat" ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 bg-gradient-saffron text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif text-lg font-bold flex items-center gap-2">
                <MessageCircle className="h-5 w-5" /> समाज चैट
              </h2>
              <NewConversationDialog
                open={openNew} setOpen={setOpenNew} userId={user.id}
                onCreated={(cid) => { setActiveId(cid); setShowMobile("chat"); loadConversations(); }}
              />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/70" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats…"
                className="pl-8 h-9 bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"/>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">कोई चैट नहीं। नई बातचीत शुरू करें →</div>}
            {filtered.map((c) => (
              <button key={c.id} onClick={() => { setActiveId(c.id); setShowMobile("chat"); }}
                className={`w-full text-left px-3 py-3 flex gap-3 items-center border-b border-accent/20 transition-smooth ${activeId === c.id ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                <Avatar className="h-12 w-12 ring-2 ring-accent/40">
                  {c.displayAvatar && <AvatarImage src={c.displayAvatar} />}
                  <AvatarFallback className="bg-gradient-saffron text-primary-foreground">
                    {c.is_group ? <Users className="h-5 w-5" /> : initials(c.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <h3 className="font-medium text-secondary truncate">{c.displayName}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: false })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessage?.deleted_at ? <em>deleted</em> :
                        c.lastMessage?.media_mime?.startsWith("image/") ? "📷 Photo" :
                        c.lastMessage?.media_mime?.startsWith("video/") ? "🎬 Video" :
                        c.lastMessage?.media_mime?.startsWith("audio/") ? "🎤 Voice note" :
                        c.lastMessage?.media_url ? "📎 File" :
                        c.lastMessage?.body || "No messages yet"}
                    </p>
                    {(c.unread ?? 0) > 0 && (
                      <Badge className="bg-gradient-saffron text-primary-foreground h-5 min-w-5 px-1.5 text-[10px]">{c.unread}</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </aside>

        <section className={`flex flex-col bg-[hsl(var(--muted))] ${showMobile === "list" ? "hidden md:flex" : "flex"}`}>
          {active ? (
            <ChatWindow conversation={active} userId={user.id} onBack={() => setShowMobile("list")} onUpdated={loadConversations} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <MessageCircle className="h-16 w-16 mx-auto text-primary/40 mb-3" />
                <p className="text-muted-foreground">किसी चैट का चयन करें या नई बातचीत शुरू करें</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// ---------- chat window ----------
const ChatWindow = ({
  conversation, userId, onBack, onUpdated,
}: { conversation: Conversation; userId: string; onBack: () => void; onUpdated: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [stars, setStars] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [showPinned, setShowPinned] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [lightbox, setLightbox] = useState<{ url: string; mime: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileMap = new Map((conversation.participants ?? []).map((p) => [p.user_id, p.profile]));
  const messageMap = new Map(messages.map((m) => [m.id, m]));
  const pollByMsg = useMemo(() => new Map(polls.map((p) => [p.message_id, p])), [polls]);
  const myParticipant = (conversation.participants ?? []).find((p) => p.user_id === userId);
  const iAmConvAdmin = !!myParticipant?.is_admin;
  const isBroadcast = !!conversation.is_broadcast;
  const canPost = !isBroadcast || iAmConvAdmin;

  const load = async () => {
    const { data } = await supabase
      .from("chat_messages").select("*").eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }).limit(500);
    const msgs = (data as Message[]) ?? [];
    setMessages(msgs);
    if (msgs.length) {
      const ids = msgs.map((m) => m.id);
      const [{ data: rxs }, { data: stz }, { data: pls }] = await Promise.all([
        supabase.from("chat_reactions").select("*").in("message_id", ids),
        supabase.from("chat_starred").select("message_id").in("message_id", ids).eq("user_id", userId),
        supabase.from("chat_polls").select("*").eq("conversation_id", conversation.id),
      ]);
      setReactions((rxs as Reaction[]) ?? []);
      setStars(new Set((stz ?? []).map((s: any) => s.message_id)));
      setPolls(((pls as any[]) ?? []) as Poll[]);
    }
    await supabase.from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id).eq("user_id", userId);
    onUpdated();
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [conversation.id]);
  useEffect(() => {
    const ch = supabase.channel(`chat-${conversation.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reactions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_polls", filter: `conversation_id=eq.${conversation.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [conversation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ---------- send actions ----------
  const send = async (extras: Partial<Message> = {}) => {
    const body = text.trim();
    if (!body && !extras.media_url) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversation.id, sender_id: userId,
      body: body || null, message_type: extras.media_mime ? extras.media_mime.split("/")[0] : "text",
      reply_to_id: replyTo?.id ?? null, ...extras,
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setText(""); setReplyTo(null);
  };

  const uploadAndSend = async (file: File, extras: Partial<Message> = {}) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${conversation.id}/${userId}/${crypto.randomUUID()}.${ext}`;
    setSending(true);
    const { error } = await supabase.storage.from("chat-media").upload(path, file, {
      contentType: file.type, upsert: false,
    });
    if (error) { setSending(false); toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    setSending(false);
    await send({
      media_url: path, media_mime: file.type, media_name: file.name, media_size: file.size,
      ...extras,
    });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast({ title: "Too large", description: "Max 25 MB", variant: "destructive" }); return; }
    await uploadAndSend(f);
  };

  const sendVoice = async (blob: Blob, durationMs: number) => {
    const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
    await uploadAndSend(file, { media_duration_ms: durationMs });
  };

  // ---------- message actions ----------
  const toggleReaction = async (msgId: string, emoji: string) => {
    const existing = reactions.find((r) => r.message_id === msgId && r.user_id === userId && r.emoji === emoji);
    if (existing) await supabase.from("chat_reactions").delete().eq("id", existing.id);
    else await supabase.from("chat_reactions").insert({ message_id: msgId, user_id: userId, emoji });
  };
  const deleteForEveryone = async (m: Message) => {
    await supabase.from("chat_messages").update({ deleted_at: new Date().toISOString(), body: null, media_url: null }).eq("id", m.id);
  };
  const togglePin = async (m: Message) => {
    await supabase.from("chat_messages").update({ is_pinned: !m.is_pinned }).eq("id", m.id);
  };
  const toggleStar = async (m: Message) => {
    if (stars.has(m.id)) await supabase.from("chat_starred").delete().eq("user_id", userId).eq("message_id", m.id);
    else await supabase.from("chat_starred").insert({ user_id: userId, message_id: m.id });
  };
  const copyText = (m: Message) => {
    if (m.body) { navigator.clipboard.writeText(m.body); toast({ title: "Copied" }); }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const otherLastRead = (conversation.participants ?? [])
    .filter((p) => p.user_id !== userId)
    .reduce<string | null>((acc, p) => (!acc || p.last_read_at > acc ? p.last_read_at : acc), null);

  // group + filter
  const visible = useMemo(() => {
    if (!searchQ.trim()) return messages;
    const q = searchQ.toLowerCase();
    return messages.filter((m) => m.body?.toLowerCase().includes(q));
  }, [messages, searchQ]);
  const grouped: { date: Date; items: Message[] }[] = [];
  visible.forEach((m) => {
    const d = new Date(m.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || !isSameDay(last.date, d)) grouped.push({ date: d, items: [m] });
    else last.items.push(m);
  });
  const pinned = messages.filter((m) => m.is_pinned && !m.deleted_at);
  const reactionsByMsg = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    reactions.forEach((r) => { const a = map.get(r.message_id) ?? []; a.push(r); map.set(r.message_id, a); });
    return map;
  }, [reactions]);

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-saffron text-primary-foreground px-3 py-2.5 flex items-center gap-3 shadow-warm">
        <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary-foreground/10" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <button onClick={() => conversation.is_group && setShowGroupInfo(true)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar className="h-10 w-10 ring-2 ring-primary-foreground/30">
            {conversation.displayAvatar && <AvatarImage src={conversation.displayAvatar} />}
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
              {isBroadcast ? <Megaphone className="h-5 w-5" /> : conversation.is_group ? <Users className="h-5 w-5" /> : initials(conversation.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-semibold leading-tight truncate flex items-center gap-1.5">
              {conversation.displayName}
              {isBroadcast && <Megaphone className="h-3.5 w-3.5 opacity-90" />}
            </h3>
            <p className="text-[11px] opacity-80 truncate">
              {isBroadcast ? "Broadcast channel" : conversation.is_group ? `${conversation.participants?.length ?? 0} members · tap for info` : "1:1 chat"}
            </p>
          </div>
        </button>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setShowSearch((v) => !v)}>
          <Search className="h-5 w-5" />
        </Button>
        {pinned.length > 0 && (
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 relative" onClick={() => setShowPinned(true)}>
            <Pin className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-primary-foreground text-primary text-[9px] rounded-full h-4 min-w-4 px-1">{pinned.length}</span>
          </Button>
        )}
        {conversation.is_group && (
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setShowGroupInfo(true)}>
            <Info className="h-5 w-5" />
          </Button>
        )}
      </div>

      {showSearch && (
        <div className="bg-card border-b border-accent/30 p-2">
          <Input autoFocus placeholder="Search in this chat…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="h-9" />
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {grouped.map((g) => (
          <div key={g.date.toISOString()}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] uppercase tracking-wider bg-card text-muted-foreground px-3 py-1 rounded-full shadow-soft">{dayLabel(g.date)}</span>
            </div>
            {g.items.map((m, idx) => {
              const mine = m.sender_id === userId;
              const prev = g.items[idx - 1];
              const showSender = conversation.is_group && !mine && (!prev || prev.sender_id !== m.sender_id);
              const senderProfile = profileMap.get(m.sender_id);
              const read = mine && otherLastRead && m.created_at <= otherLastRead;
              const replied = m.reply_to_id ? messageMap.get(m.reply_to_id) : null;
              const rxs = reactionsByMsg.get(m.id) ?? [];
              const grouped: Record<string, Reaction[]> = {};
              rxs.forEach((r) => { (grouped[r.emoji] = grouped[r.emoji] ?? []).push(r); });
              const isStarred = stars.has(m.id);

              return (
                <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"} mb-1.5`}>
                  <div className="flex items-end gap-1 max-w-[85%]">
                    {!mine && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground p-1 transition-opacity">
                            <Smile className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1.5 flex gap-1" side="top">
                          {QUICK_EMOJI.map((e) => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}

                    <div className="flex flex-col">
                      <div className={`relative rounded-2xl px-3 py-1.5 shadow-soft ${
                        mine ? "bg-gradient-saffron text-primary-foreground rounded-br-sm" : "bg-card text-foreground rounded-bl-sm border border-accent/20"
                      }`}>
                        {showSender && <div className="text-[11px] font-semibold text-primary mb-0.5">{senderProfile?.display_name ?? "Member"}</div>}

                        {m.is_pinned && !m.deleted_at && (
                          <div className={`flex items-center gap-1 text-[10px] mb-0.5 ${mine ? "text-primary-foreground/80" : "text-primary"}`}>
                            <Pin className="h-2.5 w-2.5" /> Pinned
                          </div>
                        )}

                        {replied && !m.deleted_at && (
                          <div className={`mb-1 px-2 py-1 rounded text-xs border-l-2 ${mine ? "bg-primary-foreground/15 border-primary-foreground/60" : "bg-muted border-primary"}`}>
                            <div className={`font-medium text-[10px] ${mine ? "text-primary-foreground/90" : "text-primary"}`}>
                              {replied.sender_id === userId ? "You" : profileMap.get(replied.sender_id)?.display_name ?? "Member"}
                            </div>
                            <div className="truncate opacity-80">{replied.deleted_at ? "deleted" : (replied.body || (replied.media_mime ? `📎 ${replied.media_name ?? "media"}` : ""))}</div>
                          </div>
                        )}

                        {m.deleted_at ? (
                          <em className="text-xs opacity-70 flex items-center gap-1"><Trash2 className="h-3 w-3" /> message deleted</em>
                        ) : (
                          <>
                            {m.media_url && <MediaPreview message={m} mine={mine} onOpen={(url, mime) => setLightbox({ url, mime })} />}
                            {m.body && <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>}
                          </>
                        )}

                        <div className={`flex items-center gap-1 justify-end mt-0.5 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {isStarred && <Star className="h-2.5 w-2.5 fill-current" />}
                          {m.edited_at && <span>edited</span>}
                          <span>{format(new Date(m.created_at), "HH:mm")}</span>
                          {mine && (read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                        </div>
                      </div>

                      {Object.keys(grouped).length > 0 && (
                        <div className={`flex gap-1 mt-1 flex-wrap ${mine ? "justify-end" : "justify-start"}`}>
                          {Object.entries(grouped).map(([emo, list]) => {
                            const reactedByMe = list.some((r) => r.user_id === userId);
                            return (
                              <button key={emo} onClick={() => toggleReaction(m.id, emo)}
                                className={`text-[11px] px-1.5 py-0.5 rounded-full border transition-smooth ${reactedByMe ? "bg-primary/15 border-primary/40" : "bg-card border-accent/30 hover:bg-muted"}`}>
                                {emo} {list.length}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {!m.deleted_at && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground p-1 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={mine ? "end" : "start"}>
                          <DropdownMenuItem onClick={() => setReplyTo(m)}><Reply className="h-4 w-4 mr-2" /> Reply</DropdownMenuItem>
                          {m.body && <DropdownMenuItem onClick={() => copyText(m)}><Copy className="h-4 w-4 mr-2" /> Copy</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => toggleStar(m)}>
                            {isStarred ? <><StarOff className="h-4 w-4 mr-2" /> Unstar</> : <><Star className="h-4 w-4 mr-2" /> Star</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePin(m)}><Pin className="h-4 w-4 mr-2" /> {m.is_pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
                          {mine && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteForEveryone(m)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete for everyone
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {mine && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground p-1 transition-opacity">
                            <Smile className="h-4 w-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1.5 flex gap-1" side="top">
                          {QUICK_EMOJI.map((e) => (
                            <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            {searchQ ? "No matches." : <>॥ शुभारंभ ॥<br />Send the first message</>}
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="bg-muted border-t border-accent/30 px-3 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-[11px] font-semibold text-primary">
              Replying to {replyTo.sender_id === userId ? "yourself" : profileMap.get(replyTo.sender_id)?.display_name ?? "Member"}
            </p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.body || (replyTo.media_mime ? `📎 ${replyTo.media_name ?? "media"}` : "")}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Composer */}
      <div className="bg-card border-t border-accent/30 p-2 flex items-end gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground" type="button"><Smile className="h-5 w-5" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
            <EmojiPicker onEmojiClick={(e: EmojiClickData) => setText((t) => t + e.emoji)} theme={Theme.AUTO} width={320} height={380} />
          </PopoverContent>
        </Popover>

        <input ref={fileInputRef} type="file" hidden onChange={onPickFile}
          accept="image/*,video/*,audio/*,application/pdf,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
          <Paperclip className="h-5 w-5" />
        </Button>

        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={1} placeholder="Type a message…"
          className="flex-1 resize-none rounded-2xl border border-accent/30 bg-muted/40 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32" />

        {text.trim() ? (
          <Button onClick={() => send()} disabled={sending} size="icon" className="h-10 w-10 rounded-full bg-gradient-saffron text-primary-foreground shadow-warm shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <VoiceRecorder onSend={sendVoice} disabled={sending} />
        )}
      </div>

      {/* Pinned dialog */}
      <Dialog open={showPinned} onOpenChange={setShowPinned}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Pin className="h-4 w-4" /> Pinned messages</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-96">
            {pinned.map((m) => (
              <div key={m.id} className="p-2 border-b border-accent/20">
                <p className="text-[11px] text-primary font-medium">
                  {m.sender_id === userId ? "You" : profileMap.get(m.sender_id)?.display_name ?? "Member"} · {format(new Date(m.created_at), "dd MMM HH:mm")}
                </p>
                <p className="text-sm">{m.body || (m.media_mime ? `📎 ${m.media_name}` : "")}</p>
                <Button size="sm" variant="ghost" onClick={() => togglePin(m)} className="text-xs h-6 mt-1">Unpin</Button>
              </div>
            ))}
            {pinned.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">None pinned.</p>}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </Button>
          {lightbox.mime.startsWith("image/")
            ? <img src={lightbox.url} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            : <video src={lightbox.url} controls autoPlay className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()} />}
        </div>
      )}
    </>
  );
};

// ---------- media preview ----------
const MediaPreview = ({ message, mine, onOpen }: { message: Message; mine: boolean; onOpen: (url: string, mime: string) => void }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (message.media_url) getSignedUrl(message.media_url).then(setUrl); }, [message.media_url]);
  if (!url) return <div className="h-32 w-48 bg-muted/40 rounded animate-pulse" />;
  const mime = message.media_mime ?? "";

  if (mime.startsWith("image/")) {
    return (
      <button onClick={() => onOpen(url, mime)} className="block mb-1">
        <img src={url} alt={message.media_name ?? ""} className="rounded-lg max-h-64 max-w-full object-cover" loading="lazy" />
      </button>
    );
  }
  if (mime.startsWith("video/")) {
    return (
      <button onClick={() => onOpen(url, mime)} className="block mb-1 relative">
        <video src={url} className="rounded-lg max-h-64 max-w-full" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <Play className="h-10 w-10 text-white" />
        </div>
      </button>
    );
  }
  if (mime.startsWith("audio/")) return <AudioPlayer url={url} mine={mine} duration={message.media_duration_ms} />;
  // generic file
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" download={message.media_name ?? "file"}
      className={`flex items-center gap-2 p-2 rounded mb-1 ${mine ? "bg-primary-foreground/15" : "bg-muted"}`}>
      <FileText className="h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{message.media_name ?? "file"}</p>
        <p className="text-[10px] opacity-70">{fmtSize(message.media_size)}</p>
      </div>
      <Download className="h-4 w-4" />
    </a>
  );
};

// ---------- audio player ----------
const AudioPlayer = ({ url, mine, duration }: { url: string; mine: boolean; duration: number | null }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = duration ?? 0;

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) a.pause(); else a.play();
  };

  return (
    <div className={`flex items-center gap-2 mb-1 min-w-[180px] ${mine ? "" : ""}`}>
      <Button size="icon" onClick={toggle} className={`h-8 w-8 rounded-full ${mine ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary text-primary-foreground"}`}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1">
        <div className={`h-1 rounded-full ${mine ? "bg-primary-foreground/30" : "bg-muted"}`}>
          <div className={`h-full rounded-full ${mine ? "bg-primary-foreground" : "bg-primary"}`} style={{ width: `${total ? (pos / total) * 100 : 0}%` }} />
        </div>
        <p className={`text-[10px] mt-0.5 ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{fmtMs(pos || total)}</p>
      </div>
      <audio ref={audioRef} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setPos(0); }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime * 1000)} preload="metadata" />
    </div>
  );
};

// ---------- voice recorder ----------
const VoiceRecorder = ({ onSend, disabled }: { onSend: (blob: Blob, durationMs: number) => void; disabled: boolean }) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const dur = Date.now() - startedAtRef.current;
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0 && dur > 500) onSend(blob, dur);
      };
      recRef.current = mr;
      startedAtRef.current = Date.now();
      mr.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 200);
    } catch {
      toast({ title: "Microphone blocked", description: "Allow mic access to record voice notes", variant: "destructive" });
    }
  };
  const stop = (cancel = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false); setElapsed(0);
    const mr = recRef.current; if (!mr) return;
    if (cancel) { mr.ondataavailable = null; mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop()); }
    if (mr.state !== "inactive") mr.stop();
  };

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive font-mono animate-pulse">● {fmtMs(elapsed)}</span>
        <Button size="icon" variant="outline" onClick={() => stop(true)}><X className="h-4 w-4" /></Button>
        <Button size="icon" onClick={() => stop(false)} className="h-10 w-10 rounded-full bg-gradient-saffron text-primary-foreground"><Send className="h-4 w-4" /></Button>
      </div>
    );
  }
  return (
    <Button size="icon" disabled={disabled} onClick={start} className="h-10 w-10 rounded-full bg-gradient-saffron text-primary-foreground shadow-warm shrink-0">
      <Mic className="h-4 w-4" />
    </Button>
  );
};

// ---------- new conversation ----------
const NewConversationDialog = ({
  open, setOpen, userId, onCreated,
}: { open: boolean; setOpen: (v: boolean) => void; userId: string; onCreated: (cid: string) => void }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupTitle, setGroupTitle] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: ms } = await supabase
        .from("members").select("id, full_name, email, city")
        .eq("is_published", true).not("email", "is", null).order("full_name");
      setMembers((ms as Member[]) ?? []); setSelected(new Set()); setGroupTitle(""); setSearch("");
    })();
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  };
  const filtered = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.city?.toLowerCase().includes(search.toLowerCase())
  );

  const create = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const chosen = members.filter((m) => selected.has(m.id) && m.email);
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
      const resolved = chosen.map((m) => {
        const local = m.email!.split("@")[0].toLowerCase();
        const hit = profs?.find((p) => p.display_name?.toLowerCase() === m.full_name.toLowerCase() || p.display_name?.toLowerCase() === local);
        return hit?.user_id;
      }).filter((x): x is string => Boolean(x));

      if (resolved.length === 0) {
        toast({ title: "User accounts not found", description: "Selected members haven't signed up yet.", variant: "destructive" });
        setBusy(false); return;
      }

      const isGroup = resolved.length > 1;
      if (!isGroup) {
        const { data: mine } = await supabase.from("chat_participants").select("conversation_id").eq("user_id", userId);
        const myConvIds = (mine ?? []).map((p) => p.conversation_id);
        if (myConvIds.length > 0) {
          const { data: theirs } = await supabase.from("chat_participants").select("conversation_id")
            .eq("user_id", resolved[0]).in("conversation_id", myConvIds);
          const { data: convs } = await supabase.from("chat_conversations").select("id")
            .in("id", (theirs ?? []).map((t) => t.conversation_id)).eq("is_group", false);
          if (convs && convs.length > 0) { onCreated(convs[0].id); setOpen(false); setBusy(false); return; }
        }
      }

      const { data: conv, error: convErr } = await supabase.from("chat_conversations")
        .insert({ is_group: isGroup, title: isGroup ? (groupTitle.trim() || "Group") : null, created_by: userId })
        .select().single();
      if (convErr || !conv) throw convErr;

      const rows = [
        { conversation_id: conv.id, user_id: userId, is_admin: true },
        ...resolved.map((uid) => ({ conversation_id: conv.id, user_id: uid, is_admin: false })),
      ];
      const { error: pErr } = await supabase.from("chat_participants").insert(rows);
      if (pErr) throw pErr;
      onCreated(conv.id); setOpen(false);
    } catch (e: any) {
      toast({ title: "Could not create chat", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/15">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New chat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {selected.size > 1 && (
            <div>
              <Label className="text-xs">Group name</Label>
              <Input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="e.g. Yuva Mandal" />
            </div>
          )}
          <ScrollArea className="h-72 rounded border border-accent/30">
            {filtered.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">No members.</div>}
            {filtered.map((m) => (
              <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer border-b border-accent/10">
                <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-saffron text-primary-foreground text-xs">{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-secondary truncate">{m.full_name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.city ?? "—"}</p>
                </div>
              </label>
            ))}
          </ScrollArea>
          <p className="text-[11px] text-muted-foreground">केवल वे सदस्य जो साइट पर sign-up कर चुके हैं।</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={selected.size === 0 || busy} className="bg-gradient-saffron text-primary-foreground">
            {busy ? "Creating…" : selected.size > 1 ? "Create group" : "Start chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Chat;
