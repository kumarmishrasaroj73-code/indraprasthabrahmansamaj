import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  donor_name: string;
  amount: number;
  currency: string;
  method: string | null;
  message: string | null;
  donated_on: string;
  is_anonymous: boolean;
  is_published: boolean;
};

const empty: Row = {
  id: "", donor_name: "", amount: 0, currency: "INR",
  method: "", message: "", donated_on: new Date().toISOString().slice(0, 10),
  is_anonymous: false, is_published: true,
};

const AdminDonations = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("donations").select("*").order("donated_on", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setOpen(true); };
  const startEdit = (r: Row) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.donor_name.trim() || !form.amount) {
      toast({ title: "Donor and amount required", variant: "destructive" }); return;
    }
    setBusy(true);
    const payload = {
      donor_name: form.donor_name.trim(),
      amount: Number(form.amount),
      currency: form.currency || "INR",
      method: form.method || null,
      message: form.message || null,
      donated_on: form.donated_on,
      is_anonymous: form.is_anonymous,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("donations").update(payload).eq("id", form.id)
      : await supabase.from("donations").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this donation entry?")) return;
    const { error } = await supabase.from("donations").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <IndianRupee className="h-7 w-7 text-primary" /> Donations
          </h1>
          <p className="text-sm text-muted-foreground">Total: ₹{new Intl.NumberFormat("en-IN").format(total)} across {rows.length} entries.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} donation</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Donor name *</Label>
                <Input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount (₹) *</Label>
                  <Input type="number" min="1" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
                <div><Label>Date</Label>
                  <Input type="date" value={form.donated_on} onChange={(e) => setForm({ ...form, donated_on: e.target.value })} /></div>
              </div>
              <div><Label>Method (UPI, Cash, Bank…)</Label>
                <Input value={form.method ?? ""} onChange={(e) => setForm({ ...form, method: e.target.value })} /></div>
              <div><Label>Message (optional)</Label>
                <Textarea rows={2} value={form.message ?? ""} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <div><Label>Anonymous</Label>
                  <p className="text-xs text-muted-foreground">Show as "Anonymous" on donor wall</p></div>
                <Switch checked={form.is_anonymous} onCheckedChange={(v) => setForm({ ...form, is_anonymous: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <Label>Published on donor wall</Label>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy} className="bg-gradient-saffron text-primary-foreground">
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">No donations recorded.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-semibold text-secondary truncate">
                    {r.is_anonymous ? `${r.donor_name} (anon)` : r.donor_name}
                  </h3>
                  {!r.is_published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  ₹{new Intl.NumberFormat("en-IN").format(Number(r.amount))} · {new Date(r.donated_on).toLocaleDateString()} {r.method ? `· ${r.method}` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDonations;
