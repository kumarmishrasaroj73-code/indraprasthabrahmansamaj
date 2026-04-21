import { useEffect, useState } from "react";
import { UserPlus, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  full_name: string;
  gotra: string | null;
  family_head: string | null;
  profession: string | null;
  education: string | null;
  city: string | null;
  locality: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
};

const AdminRegistrations = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [active, setActive] = useState<Row | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase.from("member_registrations").select("*").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const decide = async (status: "approved" | "rejected") => {
    if (!active || !user) return;
    const { error } = await supabase.from("member_registrations").update({
      status,
      review_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", active.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }

    if (status === "approved") {
      const { error: insErr } = await supabase.from("members").insert({
        full_name: active.full_name,
        gotra: active.gotra, family_head: active.family_head,
        profession: active.profession, education: active.education,
        city: active.city, locality: active.locality,
        phone: active.phone, email: active.email,
        is_published: true,
      });
      if (insErr) toast({ title: "Approved, but adding to directory failed", description: insErr.message, variant: "destructive" });
      else toast({ title: "Approved & added to Directory" });
    } else {
      toast({ title: "Rejected" });
    }
    setActive(null); setNotes(""); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this registration?")) return;
    const { error } = await supabase.from("member_registrations").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const statusColor = (s: string) =>
    s === "approved" ? "bg-accent text-accent-foreground" : s === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-muted text-foreground";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" /> Registrations
          </h1>
          <p className="text-sm text-muted-foreground">Review member sign-up requests.</p>
        </div>
        <div className="flex gap-1">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className={filter === f ? "bg-gradient-saffron text-primary-foreground" : ""}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <Card className="p-8 text-center text-muted-foreground">No registrations.</Card>}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg font-semibold text-secondary truncate">{r.full_name}</h3>
                  <Badge className={`${statusColor(r.status)} capitalize text-[10px]`}>{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.gotra, r.profession, r.city, r.phone, r.email].filter(Boolean).join(" · ")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {r.status === "pending" && (
                  <Button size="sm" onClick={() => { setActive(r); setNotes(""); }} className="bg-gradient-saffron text-primary-foreground">
                    Review
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review registration</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <p><strong>{active.full_name}</strong></p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                {active.gotra && <p>Gotra: {active.gotra}</p>}
                {active.family_head && <p>Family head: {active.family_head}</p>}
                {active.profession && <p>Profession: {active.profession}</p>}
                {active.education && <p>Education: {active.education}</p>}
                {active.city && <p>City: {active.city}</p>}
                {active.locality && <p>Locality: {active.locality}</p>}
                {active.phone && <p>Phone: {active.phone}</p>}
                {active.email && <p>Email: {active.email}</p>}
              </div>
              {active.message && <p className="italic text-muted-foreground">"{active.message}"</p>}
              <div>
                <Label>Review notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Approving will add this person to the public Directory.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => decide("rejected")}><X className="h-4 w-4 mr-1" /> Reject</Button>
            <Button onClick={() => decide("approved")} className="bg-gradient-saffron text-primary-foreground">
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRegistrations;
