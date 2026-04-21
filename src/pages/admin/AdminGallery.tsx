import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon, Upload, ArrowLeft, X } from "lucide-react";
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

type Album = {
  id: string; title: string; description: string | null;
  cover_url: string | null; event_date: string | null; is_published: boolean;
};
type Photo = { id: string; album_id: string; photo_url: string; caption: string | null; display_order: number };

const emptyAlbum: Album = { id: "", title: "", description: "", cover_url: null, event_date: null, is_published: true };

const AdminGallery = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [active, setActive] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Album>(emptyAlbum);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("gallery_albums").select("*").order("created_at", { ascending: false });
    setAlbums((data as Album[]) ?? []);
  };
  const loadPhotos = async (albumId: string) => {
    const { data } = await supabase.from("gallery_photos").select("*").eq("album_id", albumId).order("display_order").order("created_at");
    setPhotos((data as Photo[]) ?? []);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (active) loadPhotos(active.id); }, [active?.id]);

  const startNew = () => { setForm(emptyAlbum); setFile(null); setOpen(true); };
  const startEdit = (a: Album) => { setForm(a); setFile(null); setOpen(true); };

  const saveAlbum = async () => {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setBusy(true);
    let coverUrl = form.cover_url;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `albums/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file, { contentType: file.type });
      if (upErr) { setBusy(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
      coverUrl = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      cover_url: coverUrl,
      event_date: form.event_date || null,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("gallery_albums").update(payload).eq("id", form.id)
      : await supabase.from("gallery_albums").insert(payload);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: form.id ? "Updated" : "Created" });
    setOpen(false); load();
  };

  const removeAlbum = async (id: string) => {
    if (!confirm("Delete this album and all its photos?")) return;
    const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); if (active?.id === id) setActive(null); load(); }
  };

  const uploadPhotos = async () => {
    if (!photoFiles || !active) return;
    setPhotoBusy(true);
    const files = Array.from(photoFiles);
    for (const f of files) {
      const ext = f.name.split(".").pop();
      const path = `photos/${active.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, f, { contentType: f.type });
      if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); continue; }
      const url = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
      await supabase.from("gallery_photos").insert({ album_id: active.id, photo_url: url });
    }
    setPhotoBusy(false);
    setPhotoFiles(null);
    toast({ title: `Uploaded ${files.length} photo(s)` });
    loadPhotos(active.id);
  };

  const removePhoto = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); if (active) loadPhotos(active.id); }
  };

  if (active) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setActive(null)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to albums
        </Button>
        <h1 className="font-serif text-2xl font-bold text-secondary mb-1">{active.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage photos in this album.</p>

        <Card className="p-4 border-accent/30 mb-6">
          <Label>Add photos (multiple)</Label>
          <div className="flex gap-2 mt-2">
            <Input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(e.target.files)} />
            <Button onClick={uploadPhotos} disabled={!photoFiles || photoBusy} className="bg-gradient-saffron text-primary-foreground">
              {photoBusy ? "…" : "Upload"}
            </Button>
          </div>
        </Card>

        {photos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No photos yet.</Card>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-accent/30">
                <img src={p.photo_url} alt={p.caption ?? ""} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(p.id)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-smooth"
                  aria-label="Delete"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" /> Gallery
          </h1>
          <p className="text-sm text-muted-foreground">Albums of community photos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New album
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} album</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Description</Label>
                <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Event date</Label>
                <Input type="date" value={form.event_date ?? ""} onChange={(e) => setForm({ ...form, event_date: e.target.value || null })} /></div>
              <div><Label>Cover image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <Label>Published</Label>
                <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={saveAlbum} disabled={busy} className="bg-gradient-saffron text-primary-foreground">
                {busy ? <><Upload className="h-4 w-4 mr-2 animate-pulse" /> Saving…</> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {albums.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No albums yet.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <Card key={a.id} className="overflow-hidden border-accent/30">
              <button className="w-full text-left" onClick={() => setActive(a)}>
                <div className="aspect-[4/3] bg-gradient-warm overflow-hidden">
                  {a.cover_url ? (
                    <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent/50">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </button>
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-semibold text-secondary truncate">{a.title}</h3>
                    {!a.is_published && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                  </div>
                  {a.event_date && <p className="text-xs text-muted-foreground">{new Date(a.event_date).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeAlbum(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGallery;
