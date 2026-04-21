import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Heart, Upload } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Gender = "male" | "female" | "other";

type Row = {
  id: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  height_cm: number | null;
  gotra: string | null;
  education: string | null;
  profession: string | null;
  income_range: string | null;
  city: string | null;
  marital_status: string | null;
  about: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  photo_url: string | null;
  is_published: boolean;
};

const empty: Row = {
  id: "", full_name: "", gender: "male", date_of_birth: null, height_cm: null,
  gotra: "", education: "", profession: "", income_range: "", city: "",
  marital_status: "never_married", about: "", contact_name: "", contact_phone: "",
  contact_email: "", photo_url: null, is_published: true,
};

const AdminMatrimonial = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("matrimonial_profiles").select("*").order("created_at", { ascending: false });
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
      const path = `matrimonial/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      gotra: form.gotra || null,
      education: form.education || null,
      profession: form.profession || null,
      income_range: form.income_range || null,
      city: form.city || null,
      marital_status: form.marital_status || null,
      about: form.about || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
      contact_email: form.contact_email || null,
      photo_url: photoUrl,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("matrimonial_profiles").update(payload).eq("id", form.id)
      : await supabase.from("matrimonial_profiles").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this profile?")) return;
    const { error } = await supabase.from("matrimonial_profiles").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" /> Matrimonial
          </h1>
          <p className="text-sm text-muted-foreground">Manage matrimonial profiles for the community.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} matrimonial profile</DialogTitle></DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Full name *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v: Gender) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select></div>
              <div><Label>Date of birth</Label>
                <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>
              <div><Label>Height (cm)</Label>
                <Input type="number" value={form.height_cm ?? ""} onChange={(e) => setForm({ ...form, height_cm: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Gotra</Label>
                <Input value={form.gotra ?? ""} onChange={(e) => setForm({ ...form, gotra: e.target.value })} /></div>
              <div><Label>Education</Label>
                <Input value={form.education ?? ""} onChange={(e) => setForm({ ...form, education: e.target.value })} /></div>
              <div><Label>Profession</Label>
                <Input value={form.profession ?? ""} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
              <div><Label>Income range</Label>
                <Input placeholder="e.g. 10–15 LPA" value={form.income_range ?? ""} onChange={(e) => setForm({ ...form, income_range: e.target.value })} /></div>
              <div><Label>City</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Marital status</Label>
                <Select value={form.marital_status ?? "never_married"} onValueChange={(v) => setForm({ ...form, marital_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never_married">Never married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="sm:col-span-2"><Label>About</Label>
                <Textarea rows={3} value={form.about ?? ""} onChange={(e) => setForm({ ...form, about: e.target.value })} /></div>
              <div className="sm:col-span-2 pt-2 border-t border-accent/30">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Contact (parent/guardian)</p>
              </div>
              <div><Label>Contact name</Label>
                <Input value={form.contact_name ?? ""} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Contact phone</Label>
                <Input value={form.contact_phone ?? ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Contact email</Label>
                <Input type="email" value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
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
        {rows.length === 0 && <Card className="p-8 text-center text-muted-foreground">No profiles yet.</Card>}
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
                  <Badge variant="outline" className="text-[10px] capitalize">{r.gender}</Badge>
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

export default AdminMatrimonial;
