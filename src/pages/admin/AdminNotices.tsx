import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FileText, Upload, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Category = "meeting" | "circular" | "decision" | "legal";
type Row = {
  id: string;
  title: string;
  description: string;
  date: string;
  category: Category;
  attachment_url: string | null;
};

const empty: Row = {
  id: "",
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  category: "circular",
  attachment_url: null,
};

const AdminNotices = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("notices")
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
    setFile(null);
    setOpen(true);
  };
  const startEdit = (r: Row) => {
    setForm(r);
    setFile(null);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Title and description are required", variant: "destructive" });
      return;
    }
    setBusy(true);
    let attachmentUrl = form.attachment_url;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("notice-attachments")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setBusy(false);
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      const { data: pub } = supabase.storage.from("notice-attachments").getPublicUrl(path);
      attachmentUrl = pub.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      category: form.category,
      attachment_url: attachmentUrl,
    };
    const { error } = form.id
      ? await supabase.from("notices").update(payload).eq("id", form.id)
      : await supabase.from("notices").insert(payload);
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
    if (!confirm("Delete this notice?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
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
            <FileText className="h-7 w-7 text-primary" /> Notices
          </h1>
          <p className="text-sm text-muted-foreground">Manage formal circulars, meetings, decisions, and legal notices with PDFs.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit" : "New"} notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
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
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v: Category) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>PDF Attachment (optional)</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {form.attachment_url && !file && (
                  <a href={form.attachment_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                    <ExternalLink className="h-3 w-3" /> Current attachment
                  </a>
                )}
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
        {rows.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No notices yet.</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="p-5 border-accent/30">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-warm border border-accent/40 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className="border-accent/50 capitalize">{r.category}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</span>
                  {r.attachment_url && (
                    <Badge variant="outline" className="border-primary/40 text-primary">PDF</Badge>
                  )}
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

export default AdminNotices;
