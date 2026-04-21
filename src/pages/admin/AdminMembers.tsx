import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Upload } from "lucide-react";
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
  full_name: string;
  gotra: string | null;
  family_head: string | null;
  profession: string | null;
  education: string | null;
  city: string | null;
  locality: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  is_published: boolean;
};

const empty: Row = {
  id: "", full_name: "", gotra: "", family_head: "", profession: "",
  education: "", city: "", locality: "", phone: "", email: "",
  photo_url: null, is_published: true,
};

const AdminMembers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("members").select("*").order("full_name");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm(empty); setFile(null); setOpen(true); };
  const startEdit = (r: Row) => { setForm(r); setFile(null); setOpen(true); };

  const save = async () => {
    if (!form.full_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" }); return;
    }
    setBusy(true);
    let photoUrl = form.photo_url;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `members/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("community-photos").upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return;
      }
      photoUrl = supabase.storage.from("community-photos").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      full_name: form.full_name.trim(),
      gotra: form.gotra || null,
      family_head: form.family_head || null,
      profession: form.profession || null,
      education: form.education || null,
      city: form.city || null,
      locality: form.locality || null,
      phone: form.phone || null,
      email: form.email || null,
      photo_url: photoUrl,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("members").update(payload).eq("id", form.id)
      : await supabase.from("members").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this member?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Directory
          </h1>
          <p className="text-sm text-muted-foreground">Community members listing.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} member</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Gotra</Label>
                <Input value={form.gotra ?? ""} onChange={(e) => setForm({ ...form, gotra: e.target.value })} /></div>
              <div><Label>Family head</Label>
                <Input value={form.family_head ?? ""} onChange={(e) => setForm({ ...form, family_head: e.target.value })} /></div>
              <div><Label>Profession</Label>
                <Input value={form.profession ?? ""} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
              <div><Label>Education</Label>
                <Input value={form.education ?? ""} onChange={(e) => setForm({ ...form, education: e.target.value })} /></div>
              <div><Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Locality</Label>
                <Input value={form.locality ?? ""} onChange={(e) => setForm({ ...form, locality: e.target.value })} /></div>
              <div><Label>Phone</Label>
                <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label>
                <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Photo (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <div><Label>Published</Label>
                  <p className="text-xs text-muted-foreground">Visible to public visitors</p></div>
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
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">No members yet.</Card>}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex items-center gap-4">
              {r.photo_url ? (
                <img src={r.photo_url} alt={r.full_name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-saffron flex items-center justify-center text-primary-foreground font-serif">{r.full_name.charAt(0)}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg font-semibold text-secondary truncate">{r.full_name}</h3>
                  {!r.is_published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.gotra, r.profession, r.city].filter(Boolean).join(" · ")}
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

export default AdminMembers;
