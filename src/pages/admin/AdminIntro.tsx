import { useEffect, useState } from "react";
import { BookOpen, Save, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type Row = {
  id: string;
  section_key: string;
  language: string;
  title: string;
  body: string;
  display_order: number;
};

const AdminIntro = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("intro_content")
      .select("*")
      .order("display_order");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setRows((data as Row[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (r: Row) => {
    setSavingId(r.id);
    const { error } = await supabase
      .from("intro_content")
      .update({
        section_key: r.section_key,
        language: r.language,
        title: r.title,
        body: r.body,
        display_order: r.display_order,
      })
      .eq("id", r.id);
    setSavingId(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  const addSection = async () => {
    const { error } = await supabase.from("intro_content").insert({
      section_key: `section-${Date.now()}`,
      language: "en",
      title: "New Section",
      body: "Edit me…",
      display_order: rows.length + 1,
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    const { error } = await supabase.from("intro_content").delete().eq("id", id);
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
            <BookOpen className="h-7 w-7 text-primary" /> About Page Content
          </h1>
          <p className="text-sm text-muted-foreground">
            Edit the sections shown on the public About page. Each section can have a different language.
          </p>
        </div>
        <Button onClick={addSection} className="bg-gradient-saffron text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> New section
        </Button>
      </div>

      <div className="space-y-5">
        {rows.map((r) => (
          <Card key={r.id} className="p-5 border-accent/30">
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <div>
                <Label>Section key</Label>
                <Input value={r.section_key} onChange={(e) => update(r.id, { section_key: e.target.value })} />
              </div>
              <div>
                <Label>Language code</Label>
                <Input value={r.language} onChange={(e) => update(r.id, { language: e.target.value })} />
              </div>
              <div>
                <Label>Order</Label>
                <Input
                  type="number"
                  value={r.display_order}
                  onChange={(e) => update(r.id, { display_order: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
            </div>
            <div className="mb-3">
              <Label>Title</Label>
              <Input value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} />
            </div>
            <div className="mb-3">
              <Label>Body</Label>
              <Textarea
                rows={4}
                value={r.body}
                onChange={(e) => update(r.id, { body: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                <Trash2 className="h-4 w-4 mr-2 text-destructive" /> Delete
              </Button>
              <Button
                size="sm"
                onClick={() => save(r)}
                disabled={savingId === r.id}
                className="bg-gradient-saffron text-primary-foreground"
              >
                <Save className="h-4 w-4 mr-2" /> {savingId === r.id ? "Saving…" : "Save"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminIntro;
