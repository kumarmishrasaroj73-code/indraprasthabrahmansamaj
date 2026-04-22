import { useEffect, useState } from "react";
import { Users, UserPlus, Crown, LogOut, Trash2, ShieldCheck, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Participant = {
  id: string; user_id: string; is_admin: boolean;
  profile?: { display_name: string | null; avatar_url: string | null };
};
type Member = { id: string; full_name: string; email: string | null };

const initials = (n?: string | null) =>
  (n || "??").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const GroupInfoDialog = ({
  open, setOpen, conversation, userId, onChanged,
}: {
  open: boolean; setOpen: (v: boolean) => void;
  conversation: { id: string; title: string | null; is_group: boolean; is_broadcast?: boolean; participants?: Participant[] };
  userId: string; onChanged: () => void;
}) => {
  const [title, setTitle] = useState(conversation.title ?? "");
  const [adding, setAdding] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [pickedMembers, setPickedMembers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const me = conversation.participants?.find((p) => p.user_id === userId);
  const iAmAdmin = !!me?.is_admin;

  useEffect(() => { setTitle(conversation.title ?? ""); }, [conversation.id, conversation.title]);

  const rename = async () => {
    if (!title.trim()) return;
    const { error } = await supabase.from("chat_conversations").update({ title: title.trim() }).eq("id", conversation.id);
    if (error) { toast({ title: "Rename failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Renamed" }); onChanged();
  };
  const promote = async (p: Participant) => {
    await supabase.from("chat_participants").update({ is_admin: !p.is_admin }).eq("id", p.id);
    onChanged();
  };
  const remove = async (p: Participant) => {
    await supabase.from("chat_participants").delete().eq("id", p.id);
    onChanged();
  };
  const leave = async () => {
    if (!me) return;
    if (!confirm("Leave this group?")) return;
    await supabase.from("chat_participants").delete().eq("id", me.id);
    setOpen(false); onChanged();
  };

  const openAdd = async () => {
    setAdding(true); setPickedMembers(new Set()); setSearch("");
    const { data } = await supabase.from("members").select("id, full_name, email")
      .eq("is_published", true).not("email", "is", null).order("full_name");
    setMembers((data as Member[]) ?? []);
  };
  const doAdd = async () => {
    const chosen = members.filter((m) => pickedMembers.has(m.id) && m.email);
    const { data: profs } = await supabase.from("profiles").select("user_id, display_name");
    const resolved = chosen.map((m) => {
      const local = m.email!.split("@")[0].toLowerCase();
      const hit = profs?.find((p) => p.display_name?.toLowerCase() === m.full_name.toLowerCase() || p.display_name?.toLowerCase() === local);
      return hit?.user_id;
    }).filter((x): x is string => Boolean(x));
    const existing = new Set((conversation.participants ?? []).map((p) => p.user_id));
    const toAdd = resolved.filter((u) => !existing.has(u));
    if (toAdd.length === 0) { toast({ title: "Nothing to add", description: "Selected members are already in or haven't signed up." }); return; }
    const rows = toAdd.map((u) => ({ conversation_id: conversation.id, user_id: u, is_admin: false }));
    const { error } = await supabase.from("chat_participants").insert(rows);
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setAdding(false); onChanged();
  };

  const filteredMembers = members.filter((m) =>
    !search || m.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {conversation.is_broadcast ? <Megaphone className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4" />}
            {conversation.is_broadcast ? "Broadcast info" : "Group info"}
          </DialogTitle>
        </DialogHeader>

        {!adding ? (
          <>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <div className="flex gap-2">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!iAmAdmin} />
                  {iAmAdmin && <Button onClick={rename} variant="outline">Save</Button>}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{conversation.participants?.length ?? 0} members</p>
                {iAmAdmin && (
                  <Button size="sm" variant="ghost" onClick={openAdd}>
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                )}
              </div>

              <ScrollArea className="h-72 rounded border border-accent/30">
                {(conversation.participants ?? []).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 border-b border-accent/10">
                    <Avatar className="h-9 w-9">
                      {p.profile?.avatar_url && <AvatarImage src={p.profile.avatar_url} />}
                      <AvatarFallback className="bg-gradient-saffron text-primary-foreground text-xs">
                        {initials(p.profile?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {p.profile?.display_name ?? "Member"} {p.user_id === userId && "(you)"}
                        </span>
                        {p.is_admin && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4"><ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> admin</Badge>}
                      </div>
                    </div>
                    {iAmAdmin && p.user_id !== userId && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => promote(p)} title={p.is_admin ? "Demote" : "Promote"}>
                          <Crown className={`h-4 w-4 ${p.is_admin ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(p)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>

            <DialogFooter>
              {me && (
                <Button variant="outline" onClick={leave} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-1" /> Leave
                </Button>
              )}
              <Button onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Input placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ScrollArea className="h-72 rounded border border-accent/30">
                {filteredMembers.map((m) => {
                  const already = (conversation.participants ?? []).some(
                    (p) => p.profile?.display_name?.toLowerCase() === m.full_name.toLowerCase()
                  );
                  return (
                    <label key={m.id} className={`flex items-center gap-3 px-3 py-2 border-b border-accent/10 ${already ? "opacity-50" : "cursor-pointer hover:bg-muted"}`}>
                      <Checkbox disabled={already} checked={pickedMembers.has(m.id)}
                        onCheckedChange={() => {
                          const n = new Set(pickedMembers); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setPickedMembers(n);
                        }} />
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-gradient-saffron text-primary-foreground text-xs">{initials(m.full_name)}</AvatarFallback></Avatar>
                      <span className="text-sm truncate">{m.full_name}{already && " · already in"}</span>
                    </label>
                  );
                })}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdding(false)}>Back</Button>
              <Button onClick={doAdd} disabled={pickedMembers.size === 0} className="bg-gradient-saffron text-primary-foreground">Add selected</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
