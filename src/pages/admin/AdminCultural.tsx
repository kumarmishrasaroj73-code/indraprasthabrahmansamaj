import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Sparkles, BookOpen, Flame, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

// supabase client is generic; cast to any for newly-added tables until types regenerate
const sb = supabase as any;

type Festival = { id: string; name_en: string; name_hi: string | null; date: string; description_en: string | null; description_hi: string | null; is_published: boolean; display_order: number };
type Shloka = { id: string; sanskrit: string; meaning_en: string | null; meaning_hi: string | null; source: string | null; is_published: boolean; display_order: number };
type Temple = { id: string; name_en: string; name_hi: string | null; deity_en: string | null; deity_hi: string | null; city: string | null; address: string | null; is_published: boolean; display_order: number };

const today = () => new Date().toISOString().slice(0, 10);

function useList<T extends { id: string; display_order: number }>(table: string) {
  const [rows, setRows] = useState<T[]>([]);
  const load = async () => {
    const { data, error } = await sb.from(table).select("*").order("display_order").order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data as T[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  return { rows, load };
}

const FestivalEditor = () => {
  const { rows, load } = useList<Festival>("cultural_festivals");
  const [open, setOpen] = useState(false);
  const empty: Festival = { id: "", name_en: "", name_hi: "", date: today(), description_en: "", description_hi: "", is_published: true, display_order: 0 };
  const [form, setForm] = useState<Festival>(empty);

  const save = async () => {
    if (!form.name_en.trim()) return toast({ title: "English name required", variant: "destructive" });
    const { id, ...payload } = form;
    const { error } = id ? await sb.from("cultural_festivals").update(payload).eq("id", id) : await sb.from("cultural_festivals").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: id ? "Updated" : "Created" });
    setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this festival?")) return;
    const { error } = await sb.from("cultural_festivals").delete().eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" }); else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{rows.length} festival(s)</p>
        <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }} className="bg-gradient-saffron text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> New festival
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</p>
                <h3 className="font-serif font-semibold text-secondary truncate">{r.name_en} {r.name_hi && <span className="text-muted-foreground">· {r.name_hi}</span>}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description_en}</p>
                {!r.is_published && <span className="text-xs text-destructive">Hidden</span>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} festival</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name (English)</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
              <div><Label>Name (Hindi)</Label><Input value={form.name_hi ?? ""} onChange={e => setForm({ ...form, name_hi: e.target.value })} /></div>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Description (English)</Label><Textarea rows={3} value={form.description_en ?? ""} onChange={e => setForm({ ...form, description_en: e.target.value })} /></div>
            <div><Label>Description (Hindi)</Label><Textarea rows={3} value={form.description_hi ?? ""} onChange={e => setForm({ ...form, description_hi: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Order</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-saffron text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ShlokaEditor = () => {
  const { rows, load } = useList<Shloka>("cultural_shlokas");
  const [open, setOpen] = useState(false);
  const empty: Shloka = { id: "", sanskrit: "", meaning_en: "", meaning_hi: "", source: "", is_published: true, display_order: 0 };
  const [form, setForm] = useState<Shloka>(empty);

  const save = async () => {
    if (!form.sanskrit.trim()) return toast({ title: "Sanskrit text required", variant: "destructive" });
    const { id, ...payload } = form;
    const { error } = id ? await sb.from("cultural_shlokas").update(payload).eq("id", id) : await sb.from("cultural_shlokas").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: id ? "Updated" : "Created" }); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this shloka?")) return;
    const { error } = await sb.from("cultural_shlokas").delete().eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" }); else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{rows.length} shloka(s)</p>
        <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }} className="bg-gradient-saffron text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> New shloka
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex justify-between gap-2">
              <div className="min-w-0 flex-1">
                <pre className="font-serif text-sm text-secondary whitespace-pre-wrap line-clamp-3">{r.sanskrit}</pre>
                <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{r.meaning_en}</p>
                {r.source && <p className="text-xs text-primary mt-1">— {r.source}</p>}
                {!r.is_published && <span className="text-xs text-destructive">Hidden</span>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} shloka</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Sanskrit (Devanagari)</Label><Textarea rows={4} value={form.sanskrit} onChange={e => setForm({ ...form, sanskrit: e.target.value })} /></div>
            <div><Label>Meaning (English)</Label><Textarea rows={3} value={form.meaning_en ?? ""} onChange={e => setForm({ ...form, meaning_en: e.target.value })} /></div>
            <div><Label>Meaning (Hindi)</Label><Textarea rows={3} value={form.meaning_hi ?? ""} onChange={e => setForm({ ...form, meaning_hi: e.target.value })} /></div>
            <div><Label>Source</Label><Input value={form.source ?? ""} onChange={e => setForm({ ...form, source: e.target.value })} placeholder="Bhagavad Gītā 2.47" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Order</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-saffron text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TempleEditor = () => {
  const { rows, load } = useList<Temple>("cultural_temples");
  const [open, setOpen] = useState(false);
  const empty: Temple = { id: "", name_en: "", name_hi: "", deity_en: "", deity_hi: "", city: "", address: "", is_published: true, display_order: 0 };
  const [form, setForm] = useState<Temple>(empty);

  const save = async () => {
    if (!form.name_en.trim()) return toast({ title: "English name required", variant: "destructive" });
    const { id, ...payload } = form;
    const { error } = id ? await sb.from("cultural_temples").update(payload).eq("id", id) : await sb.from("cultural_temples").insert(payload);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: id ? "Updated" : "Created" }); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this temple?")) return;
    const { error } = await sb.from("cultural_temples").delete().eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" }); else { toast({ title: "Deleted" }); load(); }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <p className="text-sm text-muted-foreground">{rows.length} temple(s)</p>
        <Button size="sm" onClick={() => { setForm(empty); setOpen(true); }} className="bg-gradient-saffron text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" /> New temple
        </Button>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map(r => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-serif font-semibold text-secondary">{r.name_en} {r.name_hi && <span className="text-muted-foreground">· {r.name_hi}</span>}</h3>
                <p className="text-sm text-muted-foreground">{r.deity_en}</p>
                <p className="text-xs text-primary mt-1">{r.city}{r.address ? ` · ${r.address}` : ""}</p>
                {!r.is_published && <span className="text-xs text-destructive">Hidden</span>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} temple</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name (English)</Label><Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></div>
              <div><Label>Name (Hindi)</Label><Input value={form.name_hi ?? ""} onChange={e => setForm({ ...form, name_hi: e.target.value })} /></div>
              <div><Label>Deity (English)</Label><Input value={form.deity_en ?? ""} onChange={e => setForm({ ...form, deity_en: e.target.value })} /></div>
              <div><Label>Deity (Hindi)</Label><Input value={form.deity_hi ?? ""} onChange={e => setForm({ ...form, deity_hi: e.target.value })} /></div>
              <div><Label>City</Label><Input value={form.city ?? ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address ?? ""} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Order</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              <div className="flex items-end gap-2"><Switch checked={form.is_published} onCheckedChange={v => setForm({ ...form, is_published: v })} /><Label>Published</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-saffron text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminCultural = () => (
  <div>
    <div className="mb-6">
      <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
        <Sparkles className="h-7 w-7 text-primary" /> Cultural Content
      </h1>
      <p className="text-sm text-muted-foreground">Manage festivals, shlokas and temples shown on the Utsav page (English + Hindi).</p>
    </div>
    <Tabs defaultValue="festivals">
      <TabsList className="grid grid-cols-3 max-w-md mb-6">
        <TabsTrigger value="festivals"><Calendar className="h-4 w-4 mr-1" />Festivals</TabsTrigger>
        <TabsTrigger value="shlokas"><BookOpen className="h-4 w-4 mr-1" />Shlokas</TabsTrigger>
        <TabsTrigger value="temples"><Flame className="h-4 w-4 mr-1" />Temples</TabsTrigger>
      </TabsList>
      <TabsContent value="festivals"><FestivalEditor /></TabsContent>
      <TabsContent value="shlokas"><ShlokaEditor /></TabsContent>
      <TabsContent value="temples"><TempleEditor /></TabsContent>
    </Tabs>
  </div>
);

export default AdminCultural;
