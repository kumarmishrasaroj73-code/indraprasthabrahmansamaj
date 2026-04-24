import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import {
  Bell, FileText, BookOpen, Users, Heart, Calendar, MessageCircle, IndianRupee,
  UserPlus, TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--muted-foreground))"];

const startOfDayIso = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

const last30Days = () => {
  const days: { label: string; key: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      key: d.toISOString().slice(0, 10),
    });
  }
  return days;
};

const AdminOverview = () => {
  const [stats, setStats] = useState({
    announcements: 0,
    notices: 0,
    intro: 0,
    members: 0,
    matrimonial: 0,
    events: 0,
    chat_msgs: 0,
    pending_regs: 0,
    donation_total: 0,
  });
  const [memberSeries, setMemberSeries] = useState<any[]>([]);
  const [chatSeries, setChatSeries] = useState<any[]>([]);
  const [regFunnel, setRegFunnel] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const since = startOfDayIso(new Date(Date.now() - 30 * 24 * 3600 * 1000));

      const [a, n, i, m, mt, e, regsAll, donAll, chatRecent, memRecent] = await Promise.all([
        supabase.from("announcements").select("*", { count: "exact", head: true }),
        supabase.from("notices").select("*", { count: "exact", head: true }),
        supabase.from("intro_content").select("*", { count: "exact", head: true }),
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase.from("matrimonial_profiles").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase.from("member_registrations").select("status, created_at"),
        supabase.from("donations").select("donor_name, amount, donated_on, is_anonymous"),
        supabase.from("chat_messages").select("created_at").gte("created_at", since),
        supabase.from("members").select("created_at").gte("created_at", since),
      ]);

      // Funnel of registrations
      const funnelMap: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
      ((regsAll.data as any[]) ?? []).forEach((r) => {
        funnelMap[r.status] = (funnelMap[r.status] ?? 0) + 1;
      });
      setRegFunnel(
        Object.entries(funnelMap).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
      );

      // Top donors (last 90 days, deduped)
      const totals: Record<string, number> = {};
      let donationTotal = 0;
      ((donAll.data as any[]) ?? []).forEach((d) => {
        donationTotal += Number(d.amount) || 0;
        const name = d.is_anonymous ? "Anonymous" : d.donor_name || "Unknown";
        totals[name] = (totals[name] ?? 0) + (Number(d.amount) || 0);
      });
      const top = Object.entries(totals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
      setTopDonors(top);

      // 30-day series
      const days = last30Days();
      const cMap: Record<string, number> = {};
      ((chatRecent.data as any[]) ?? []).forEach((row) => {
        const k = String(row.created_at).slice(0, 10);
        cMap[k] = (cMap[k] ?? 0) + 1;
      });
      const mMap: Record<string, number> = {};
      ((memRecent.data as any[]) ?? []).forEach((row) => {
        const k = String(row.created_at).slice(0, 10);
        mMap[k] = (mMap[k] ?? 0) + 1;
      });
      setChatSeries(days.map((d) => ({ date: d.label, messages: cMap[d.key] ?? 0 })));
      setMemberSeries(days.map((d) => ({ date: d.label, added: mMap[d.key] ?? 0 })));

      setStats({
        announcements: a.count ?? 0,
        notices: n.count ?? 0,
        intro: i.count ?? 0,
        members: m.count ?? 0,
        matrimonial: mt.count ?? 0,
        events: e.count ?? 0,
        chat_msgs: (chatRecent.data as any[])?.length ?? 0,
        pending_regs: funnelMap.pending,
        donation_total: donationTotal,
      });
    };
    load();
  }, []);

  const cards = [
    { icon: Users, label: "Members", value: stats.members, color: "text-primary" },
    { icon: UserPlus, label: "Pending registrations", value: stats.pending_regs, color: "text-primary" },
    { icon: IndianRupee, label: "Donations (₹)", value: stats.donation_total.toLocaleString(), color: "text-secondary" },
    { icon: Heart, label: "Matrimonial profiles", value: stats.matrimonial, color: "text-primary" },
    { icon: Calendar, label: "Events", value: stats.events, color: "text-secondary" },
    { icon: MessageCircle, label: "Chat (30d)", value: stats.chat_msgs, color: "text-primary" },
    { icon: Bell, label: "Announcements", value: stats.announcements, color: "text-secondary" },
    { icon: FileText, label: "Notices", value: stats.notices, color: "text-secondary" },
    { icon: BookOpen, label: "About sections", value: stats.intro, color: "text-accent-foreground" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-secondary mb-2">Welcome, Admin</h1>
        <p className="text-muted-foreground">
          Manage all community content from this central dashboard.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="p-5 border-accent/30">
            <Icon className={`h-7 w-7 mb-2 ${color}`} />
            <div className="text-2xl font-bold text-secondary font-serif">{value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-secondary">Members added (30 days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={memberSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="added" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-secondary">Chat activity (30 days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chatSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-secondary">Registrations funnel</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={regFunnel} dataKey="value" nameKey="name" outerRadius={80} label>
                {regFunnel.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 border-accent/30">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-secondary">Top donors</h2>
          </div>
          {topDonors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No donations recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topDonors} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
