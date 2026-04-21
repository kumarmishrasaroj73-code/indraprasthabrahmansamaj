import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Calendar as CalIcon, Upload } from "lucide-react";
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
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  allow_rsvp: boolean;
  is_published: boolean;
};

const empty: Row = {
  id: "", title: "", description: "",
  event_date: new Date().toISOString().slice(0, 16),
  end_date: null, location: "", image_url: null,
  allow_rsvp: true, is_published: true,
};

const AdminEvents = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setFile(null); setOpen(true); };
  const startEdit = (r: Row) => {
    setForm({ ...r, event_date: r.event_date.slice(0, 16), end_date: r.end_date ? r.end_date.slice(0, 16) : null });
    setFile(null); setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.event_date) {
      toast({ title: "Title and date required", variant: "destructive" }); return;
    }
    setBusy(true);
    let imageUrl = form.image_url;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) { setBusy(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
      imageUrl = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      event_date: new Date(form.event_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      location: form.location || null,
      image_url: imageUrl,
      allow_rsvp: form.allow_rsvp,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("events").update(payload).eq("id", form.id)
      : await supabase.from("events").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <CalIcon className="h-7 w-7 text-primary" /> Events
          </h1>
          <p className="text-sm text-muted-foreground">Festivals, meetings & ceremonies.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} event</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label>
                <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start *</Label>
                  <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label>End</Label>
                  <Input type="datetime-local" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} /></div>
              </div>
              <div><Label>Location</Label>
                <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>Cover image (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <Label>Allow RSVP</Label>
                <Switch checked={form.allow_rsvp} onCheckedChange={(v) => setForm({ ...form, allow_rsvp: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <Label>Published</Label>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={busy} className="bg-gradient-saffron text-primary-foreground">
                {busy ? <><Upload className="h-4 w-4 mr-2 animate-pulse" /> Saving…</> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">No events yet.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-14 rounded-lg bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase">{new Date(r.event_date).toLocaleString("default", { month: "short" })}</span>
                <span className="font-serif text-xl font-bold leading-none">{new Date(r.event_date).getDate()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-semibold text-secondary truncate">{r.title}</h3>
                  {!r.is_published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                  {!r.allow_rsvp && <Badge variant="outline" className="text-[10px]">No RSVP</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(r.event_date).toLocaleString()} {r.location ? ` · ${r.location}` : ""}
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

export default AdminEvents;
