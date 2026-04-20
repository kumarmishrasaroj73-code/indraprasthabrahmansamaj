import { useEffect, useState } from "react";
import { Bell, FileText, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const [counts, setCounts] = useState({ announcements: 0, notices: 0, intro: 0 });

  useEffect(() => {
    const load = async () => {
      const [a, n, i] = await Promise.all([
        supabase.from("announcements").select("*", { count: "exact", head: true }),
        supabase.from("notices").select("*", { count: "exact", head: true }),
        supabase.from("intro_content").select("*", { count: "exact", head: true }),
      ]);
      setCounts({
        announcements: a.count ?? 0,
        notices: n.count ?? 0,
        intro: i.count ?? 0,
      });
    };
    load();
  }, []);

  const stats = [
    { icon: Bell, label: "Announcements", value: counts.announcements, color: "text-primary" },
    { icon: FileText, label: "Notices", value: counts.notices, color: "text-secondary" },
    { icon: BookOpen, label: "About sections", value: counts.intro, color: "text-accent-foreground" },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-secondary mb-2">Welcome, Admin</h1>
      <p className="text-muted-foreground mb-8">
        Manage all community content from this central dashboard.
      </p>
      <div className="grid sm:grid-cols-3 gap-5">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="p-6 ornate-border">
            <Icon className={`h-8 w-8 mb-3 ${color}`} />
            <div className="text-3xl font-bold text-secondary font-serif">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
