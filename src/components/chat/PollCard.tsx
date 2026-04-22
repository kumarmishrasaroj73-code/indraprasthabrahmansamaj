import { useEffect, useState } from "react";
import { CheckCircle2, Lock, Trash2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export type Poll = {
  id: string;
  message_id: string;
  conversation_id: string;
  created_by: string;
  question: string;
  options: { id: string; text: string }[];
  allow_multiple: boolean;
  closes_at: string | null;
  is_closed: boolean;
};
type Vote = { id: string; poll_id: string; user_id: string; option_id: string };

export const PollCard = ({
  poll, userId, mine, canManage,
}: { poll: Poll; userId: string; mine: boolean; canManage: boolean }) => {
  const [votes, setVotes] = useState<Vote[]>([]);

  const load = async () => {
    const { data } = await supabase.from("chat_poll_votes").select("*").eq("poll_id", poll.id);
    setVotes((data as Vote[]) ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`poll-${poll.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_poll_votes", filter: `poll_id=eq.${poll.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_polls", filter: `id=eq.${poll.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [poll.id]);

  const closed = poll.is_closed || (poll.closes_at && new Date(poll.closes_at) < new Date());
  const total = votes.length;
  const myVotes = new Set(votes.filter((v) => v.user_id === userId).map((v) => v.option_id));

  const toggle = async (optId: string) => {
    if (closed) return;
    if (myVotes.has(optId)) {
      await supabase.from("chat_poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId).eq("option_id", optId);
      return;
    }
    if (!poll.allow_multiple && myVotes.size > 0) {
      await supabase.from("chat_poll_votes").delete().eq("poll_id", poll.id).eq("user_id", userId);
    }
    const { error } = await supabase.from("chat_poll_votes").insert({ poll_id: poll.id, user_id: userId, option_id: optId });
    if (error) toast({ title: "Vote failed", description: error.message, variant: "destructive" });
  };

  const close = async () => {
    await supabase.from("chat_polls").update({ is_closed: true }).eq("id", poll.id);
  };

  return (
    <div className={`mb-1 rounded-lg p-2.5 min-w-[240px] max-w-sm ${mine ? "bg-primary-foreground/15" : "bg-muted"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-70 mb-1">
        <BarChart3 className="h-3 w-3" /> Poll {poll.allow_multiple && "· multi"} {closed && "· closed"}
      </div>
      <p className="text-sm font-medium mb-2">{poll.question}</p>
      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const count = votes.filter((v) => v.option_id === o.id).length;
          const pct = total ? (count / total) * 100 : 0;
          const picked = myVotes.has(o.id);
          return (
            <button key={o.id} onClick={() => toggle(o.id)} disabled={!!closed}
              className={`relative w-full text-left rounded-md border px-2.5 py-1.5 text-xs transition-smooth ${
                picked ? "border-primary bg-primary/10" : `border-accent/30 ${mine ? "bg-primary-foreground/10" : "bg-card"} hover:bg-muted/70`
              } ${closed ? "cursor-default" : "cursor-pointer"}`}>
              <div className="absolute inset-y-0 left-0 rounded-md bg-primary/15" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  {picked && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <span className="truncate">{o.text}</span>
                </span>
                <span className="text-[10px] opacity-70 shrink-0">{count} · {pct.toFixed(0)}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10px] opacity-70">
        <span>{total} vote{total === 1 ? "" : "s"}</span>
        {!closed && canManage && (
          <Button size="sm" variant="ghost" onClick={close} className="h-6 text-[10px]">
            <Lock className="h-3 w-3 mr-1" /> Close
          </Button>
        )}
        {closed && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> closed</span>}
      </div>
    </div>
  );
};
