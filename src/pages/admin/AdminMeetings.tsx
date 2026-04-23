import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  agenda: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  meeting_link: string | null;
  meeting_type: "in_person" | "online" | "hybrid";
  status: "scheduled" | "completed" | "cancelled";
  minutes: string | null;
  is_published: boolean;
};

const empty: Row = {
  id: "",
  title: "",
  agenda: "",
  scheduled_at: new Date().toISOString().slice(0, 16),
  duration_minutes: 60,
  location: "",
  meeting_link: "",
  meeting_type: "in_person",
  status: "scheduled",
  minutes: "",
  is_published: true,
};

const AdminMeetings = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: false });
    if (error)
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
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
    setForm({ ...r, scheduled_at: r.scheduled_at.slice(0, 16) });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.scheduled_at) {
      toast({ title: "Title and date required", variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      agenda: form.agenda || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: form.duration_minutes || 60,
      location: form.location || null,
      meeting_link: form.meeting_link || null,
      meeting_type: form.meeting_type,
      status: form.status,
      minutes: form.minutes || null,
      is_published: form.is_published,
    };
    const { error } = form.id
      ? await supabase.from("meetings").update(payload).eq("id", form.id)
      : await supabase.from("meetings").insert(payload);
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
    if (!confirm("Delete this meeting?")) return;
    const { error } = await supabase.from("meetings").delete().eq("id", id);
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
            <CalendarDays className="h-7 w-7 text-primary" /> Meetings
          </h1>
          <p className="text-sm text-muted-foreground">
            Schedule Samaj meetings, share agenda, publish minutes.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew} className="bg-gradient-saffron text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit" : "New"} meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Agenda</Label>
                <Textarea
                  rows={3}
                  value={form.agenda ?? ""}
                  onChange={(e) => setForm({ ...form, agenda: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date & time *</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.meeting_type}
                    onValueChange={(v) =>
                      setForm({ ...form, meeting_type: v as Row["meeting_type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as Row["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div>
                <Label>Meeting link (Zoom / Meet)</Label>
                <Input
                  value={form.meeting_link ?? ""}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label>Minutes (after meeting)</Label>
                <Textarea
                  rows={4}
                  value={form.minutes ?? ""}
                  onChange={(e) => setForm({ ...form, minutes: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-accent/30 p-3">
                <Label>Published</Label>
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm({ ...form, is_published: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={busy}
                className="bg-gradient-saffron text-primary-foreground"
              >
                {busy ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">No meetings yet.</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className="p-4 border-accent/30">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-14 rounded-lg bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center">
                <span className="text-[10px] uppercase">
                  {new Date(r.scheduled_at).toLocaleString("default", { month: "short" })}
                </span>
                <span className="font-serif text-xl font-bold leading-none">
                  {new Date(r.scheduled_at).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif text-lg font-semibold text-secondary truncate">
                    {r.title}
                  </h3>
                  {!r.is_published && (
                    <Badge variant="outline" className="text-[10px]">Hidden</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {new Date(r.scheduled_at).toLocaleString()} · {r.duration_minutes} min
                  {r.location ? ` · ${r.location}` : ""}
                </p>
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

export default AdminMeetings;
