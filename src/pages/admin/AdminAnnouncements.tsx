import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  title: string;
  description: string;
  date: string;
  urgent: boolean;
};

const empty = { id: "", title: "", description: "", date: new Date().toISOString().slice(0, 10), urgent: false };

const AdminAnnouncements = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("date", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data as Row[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setForm(empty);
    setOpen(true);
  };
  const startEdit = (r: Row) => {
    setForm(r);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      urgent: form.urgent,
    };
    const { error } = form.id
      ? await supabase.from("announcements").update(payload).eq("id", form.id)
      : await supabase.from("announcements").insert(payload);
    setBusy(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground">Post community updates. Mark urgent to highlight on home.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit" : "New"} announcement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <Switch
                    checked={form.urgent}
                    onCheckedChange={(v) => setForm({ ...form, urgent: v })}
                    id="urgent"
                  />
                  <Label htmlFor="urgent" className="mb-2">Mark urgent</Label>
                </div>
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

      <div className="space-y-3">
        {rows.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No announcements yet.</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className={`p-5 ${r.urgent ? "ornate-border" : "border-accent/30"}`}>
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                r.urgent ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
              }`}>
                {r.urgent ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {r.urgent && <Badge className="bg-destructive text-destructive-foreground">Urgent</Badge>}
                  <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-secondary">{r.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminAnnouncements;
