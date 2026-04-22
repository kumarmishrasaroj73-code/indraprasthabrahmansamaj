import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export const CreatePollDialog = ({
  open, setOpen, conversationId, userId,
}: { open: boolean; setOpen: (v: boolean) => void; conversationId: string; userId: string }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setQuestion(""); setOptions(["", ""]); setAllowMultiple(false); };

  const submit = async () => {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      toast({ title: "Need a question and 2+ options", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data: msg, error: mErr } = await supabase.from("chat_messages").insert({
        conversation_id: conversationId, sender_id: userId, message_type: "poll", body: `📊 ${q}`,
      }).select().single();
      if (mErr || !msg) throw mErr;
      const optionsJson = opts.map((text, i) => ({ id: `o${i + 1}`, text }));
      const { error: pErr } = await supabase.from("chat_polls").insert({
        message_id: msg.id, conversation_id: conversationId, created_by: userId,
        question: q, options: optionsJson, allow_multiple: allowMultiple,
      });
      if (pErr) throw pErr;
      reset(); setOpen(false);
    } catch (e: any) {
      toast({ title: "Could not create poll", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Create poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Question</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask members…" />
          </div>
          <div>
            <Label className="text-xs">Options</Label>
            <div className="space-y-2 mt-1">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={o} onChange={(e) => {
                    const next = [...options]; next[i] = e.target.value; setOptions(next);
                  }} placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 8 && (
                <Button size="sm" variant="outline" onClick={() => setOptions([...options, ""])}>
                  <Plus className="h-3 w-3 mr-1" /> Add option
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Allow multiple answers</Label>
              <p className="text-[11px] text-muted-foreground">Members can pick more than one</p>
            </div>
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-gradient-saffron text-primary-foreground">
            {busy ? "Posting…" : "Post poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
