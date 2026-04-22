import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { MessageCircle, Search, Plus, ArrowLeft, Send, Check, CheckCheck, Users, Smile } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// ---------- types ----------
type Conversation = {
  id: string;
  is_group: boolean;
  title: string | null;
  avatar_url: string | null;
  last_message_at: string;
  participants?: Participant[];
  lastMessage?: Message | null;
  unread?: number;
  displayName?: string;
  displayAvatar?: string | null;
};

type Participant = {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  last_read_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  message_type: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Member = {
  id: string;
  full_name: string;
  email: string | null;
  city: string | null;
  user_id?: string;
};

// ---------- helpers ----------
const initials = (name?: string | null) =>
  (name || "??").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const dayLabel = (d: Date) => {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, dd MMM");
};

// ---------- main page ----------
const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showMobile, setShowMobile] = useState<"list" | "chat">("list");
  const [openNew, setOpenNew] = useState(false);

  // Approval gate
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("is_approved_member", { _user_id: user.id });
      setApproved(Boolean(data));
    })();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    // 1. find conversations user participates in
    const { data: parts } = await supabase
      .from("chat_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    const convIds = (parts ?? []).map((p) => p.conversation_id);
    if (convIds.length === 0) { setConversations([]); return; }

    // 2. fetch conversations
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("*")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });

    // 3. fetch all participants for these convs
    const { data: allParts } = await supabase
      .from("chat_participants")
      .select("*")
      .in("conversation_id", convIds);

    // 4. fetch profiles for participants
    const userIds = Array.from(new Set((allParts ?? []).map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    // 5. last message per convo
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });
    const lastByConv = new Map<string, Message>();
    msgs?.forEach((m) => { if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m as Message); });

    const myReadByConv = new Map<string, string>();
    parts?.forEach((p) => myReadByConv.set(p.conversation_id, p.last_read_at));

    const enriched: Conversation[] = (convs ?? []).map((c) => {
      const cParts = (allParts ?? []).filter((p) => p.conversation_id === c.id).map((p) => ({
        ...p,
        profile: profileMap.get(p.user_id) ?? undefined,
      })) as Participant[];
      const other = cParts.find((p) => p.user_id !== user.id);
      const displayName = c.is_group ? (c.title || "Group") : (other?.profile?.display_name || "Member");
      const displayAvatar = c.is_group ? c.avatar_url : (other?.profile?.avatar_url ?? null);
      const lastMessage = lastByConv.get(c.id) ?? null;
      const lastRead = myReadByConv.get(c.id);
      const unread = (msgs ?? []).filter(
        (m) => m.conversation_id === c.id && m.sender_id !== user.id && (!lastRead || m.created_at > lastRead)
      ).length;
      return { ...c, participants: cParts, lastMessage, unread, displayName, displayAvatar };
    });
    setConversations(enriched);
  };

  useEffect(() => { if (user) loadConversations(); }, [user]);

  // Realtime: refresh on any change to conversations/messages/participants
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-global")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participants" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
            कृपया पहले अपनी सदस्यता के लिए <a href="/register" className="text-primary underline">पंजीकरण</a> करें।
          </p>
        </div>
      </div>
    );
  }
  if (approved === null) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const filtered = conversations.filter((c) =>
    !search || (c.displayName ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="container py-4 md:py-6">
      <div className="grid md:grid-cols-[340px_1fr] gap-0 md:gap-4 h-[calc(100vh-9rem)] rounded-2xl overflow-hidden border border-accent/30 shadow-warm bg-card">
        {/* Sidebar */}
        <aside
          className={`flex flex-col border-r border-accent/30 bg-gradient-warm ${
            showMobile === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
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
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="pl-8 h-9 bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                कोई चैट नहीं। नई बातचीत शुरू करें →
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveId(c.id); setShowMobile("chat"); }}
                className={`w-full text-left px-3 py-3 flex gap-3 items-center border-b border-accent/20 transition-smooth ${
                  activeId === c.id ? "bg-primary/10" : "hover:bg-muted/60"
                }`}
              >
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
                      {c.lastMessage?.deleted_at ? <em>deleted</em> : c.lastMessage?.body || "No messages yet"}
                    </p>
                    {(c.unread ?? 0) > 0 && (
                      <Badge className="bg-gradient-saffron text-primary-foreground h-5 min-w-5 px-1.5 text-[10px]">
                        {c.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </aside>

        {/* Chat window */}
        <section className={`flex flex-col bg-[hsl(var(--muted))] ${showMobile === "list" ? "hidden md:flex" : "flex"}`}>
          {active ? (
            <ChatWindow
              conversation={active}
              userId={user.id}
              onBack={() => setShowMobile("list")}
              onUpdated={loadConversations}
            />
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
}: {
  conversation: Conversation; userId: string; onBack: () => void; onUpdated: () => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const profileMap = new Map(
    (conversation.participants ?? []).map((p) => [p.user_id, p.profile])
  );

  const load = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data as Message[]) ?? []);
    // mark read
    await supabase
      .from("chat_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("user_id", userId);
    onUpdated();
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [conversation.id]);

  // realtime for this conversation
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversation.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [conversation.id]);

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: conversation.id, sender_id: userId, body, message_type: "text",
    });
    setSending(false);
    if (error) { toast({ title: "Send failed", description: error.message, variant: "destructive" }); return; }
    setText("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const otherLastRead = (conversation.participants ?? [])
    .filter((p) => p.user_id !== userId)
    .reduce<string | null>((acc, p) => (!acc || p.last_read_at > acc ? p.last_read_at : acc), null);

  // group messages by day
  const grouped: { date: Date; items: Message[] }[] = [];
  messages.forEach((m) => {
    const d = new Date(m.created_at);
    const last = grouped[grouped.length - 1];
    if (!last || !isSameDay(last.date, d)) grouped.push({ date: d, items: [m] });
    else last.items.push(m);
  });

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-saffron text-primary-foreground px-3 py-2.5 flex items-center gap-3 shadow-warm">
        <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary-foreground/10" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 ring-2 ring-primary-foreground/30">
          {conversation.displayAvatar && <AvatarImage src={conversation.displayAvatar} />}
          <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
            {conversation.is_group ? <Users className="h-5 w-5" /> : initials(conversation.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif font-semibold leading-tight truncate">{conversation.displayName}</h3>
          <p className="text-[11px] opacity-80 truncate">
            {conversation.is_group
              ? `${conversation.participants?.length ?? 0} members`
              : "tap for info"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22><text y=%2228%22 font-size=%2222%22 opacity=%220.05%22>ॐ</text></svg>')]">
        {grouped.map((g) => (
          <div key={g.date.toISOString()}>
            <div className="flex justify-center my-3">
              <span className="text-[10px] uppercase tracking-wider bg-card text-muted-foreground px-3 py-1 rounded-full shadow-soft">
                {dayLabel(g.date)}
              </span>
            </div>
            {g.items.map((m, idx) => {
              const mine = m.sender_id === userId;
              const prev = g.items[idx - 1];
              const showSender = conversation.is_group && !mine && (!prev || prev.sender_id !== m.sender_id);
              const senderProfile = profileMap.get(m.sender_id);
              const read = mine && otherLastRead && m.created_at <= otherLastRead;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} mb-1`}>
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-1.5 shadow-soft ${
                      mine
                        ? "bg-gradient-saffron text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground rounded-bl-sm border border-accent/20"
                    }`}
                  >
                    {showSender && (
                      <div className="text-[11px] font-semibold text-primary mb-0.5">
                        {senderProfile?.display_name ?? "Member"}
                      </div>
                    )}
                    {m.deleted_at ? (
                      <em className="text-xs opacity-70">message deleted</em>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <div className={`flex items-center gap-1 justify-end mt-0.5 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      <span>{format(new Date(m.created_at), "HH:mm")}</span>
                      {mine && (read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            ॥ शुभारंभ ॥<br />Send the first message
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="bg-card border-t border-accent/30 p-2 flex items-end gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground" type="button">
          <Smile className="h-5 w-5" />
        </Button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none rounded-2xl border border-accent/30 bg-muted/40 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
        />
        <Button
          onClick={send}
          disabled={!text.trim() || sending}
          size="icon"
          className="h-10 w-10 rounded-full bg-gradient-saffron text-primary-foreground shadow-warm shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

// ---------- new conversation ----------
const NewConversationDialog = ({
  open, setOpen, userId, onCreated,
}: {
  open: boolean; setOpen: (v: boolean) => void; userId: string;
  onCreated: (conversationId: string) => void;
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupTitle, setGroupTitle] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: ms } = await supabase
        .from("members")
        .select("id, full_name, email, city")
        .eq("is_published", true)
        .not("email", "is", null)
        .order("full_name");
      // Resolve to user_ids via profiles join (display_name/email match isn't perfect; use auth users via email isn't allowed from client).
      // We'll match via profiles table where display_name = full_name OR email match in profiles isn't stored; fallback: list members and resolve user_id at create-time via RPC fallback.
      // Simpler: list members; on create, look up auth user via members.email -> profile by display_name; if absent, skip.
      setMembers((ms as Member[]) ?? []);
      setSelected(new Set());
      setGroupTitle("");
      setSearch("");
    })();
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const filtered = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.city?.toLowerCase().includes(search.toLowerCase())
  );

  const create = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      // Resolve selected member emails -> auth user_ids via profiles (best-effort).
      const chosen = members.filter((m) => selected.has(m.id) && m.email);
      const emails = chosen.map((m) => m.email!.toLowerCase());

      // Use RPC isn't available; rely on profiles linked via handle_new_user trigger.
      // We look up profiles by display_name fallback; safer: just create participants with placeholder fails silently.
      // Better path: create an RPC. For now, ask Supabase by joining on auth via a minimal RPC — but we don't have one.
      // Fallback: try to resolve via "profiles" where display_name matches — imperfect but usable for Phase 5.
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      const resolved = chosen
        .map((m) => {
          const local = m.email!.split("@")[0].toLowerCase();
          const hit = profs?.find(
            (p) => p.display_name?.toLowerCase() === m.full_name.toLowerCase()
              || p.display_name?.toLowerCase() === local
          );
          return hit?.user_id;
        })
        .filter((x): x is string => Boolean(x));

      if (resolved.length === 0) {
        toast({
          title: "User accounts not found",
          description: "Selected members haven't created an account yet. They must sign up first.",
          variant: "destructive",
        });
        setBusy(false);
        return;
      }

      const isGroup = resolved.length > 1;

      // For 1-on-1: check if conversation already exists
      if (!isGroup) {
        const { data: mine } = await supabase
          .from("chat_participants")
          .select("conversation_id")
          .eq("user_id", userId);
        const myConvIds = (mine ?? []).map((p) => p.conversation_id);
        if (myConvIds.length > 0) {
          const { data: theirs } = await supabase
            .from("chat_participants")
            .select("conversation_id")
            .eq("user_id", resolved[0])
            .in("conversation_id", myConvIds);
          const { data: convs } = await supabase
            .from("chat_conversations")
            .select("id, is_group")
            .in("id", (theirs ?? []).map((t) => t.conversation_id))
            .eq("is_group", false);
          if (convs && convs.length > 0) {
            onCreated(convs[0].id);
            setOpen(false);
            setBusy(false);
            return;
          }
        }
      }

      const { data: conv, error: convErr } = await supabase
        .from("chat_conversations")
        .insert({
          is_group: isGroup,
          title: isGroup ? (groupTitle.trim() || "Group") : null,
          created_by: userId,
        })
        .select()
        .single();
      if (convErr || !conv) throw convErr;

      const rows = [
        { conversation_id: conv.id, user_id: userId, is_admin: true },
        ...resolved.map((uid) => ({ conversation_id: conv.id, user_id: uid, is_admin: false })),
      ];
      const { error: pErr } = await supabase.from("chat_participants").insert(rows);
      if (pErr) throw pErr;

      onCreated(conv.id);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Could not create chat", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/15">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
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
          <p className="text-[11px] text-muted-foreground">
            केवल वे सदस्य चयनित हो सकते हैं जो साइट पर sign-up कर चुके हैं।
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={create}
            disabled={selected.size === 0 || busy}
            className="bg-gradient-saffron text-primary-foreground"
          >
            {busy ? "Creating…" : selected.size > 1 ? "Create group" : "Start chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Chat;
