import { useEffect, useMemo, useState } from "react";
import { Lock, Search, ShieldCheck, ShieldOff, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type Profile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AccessRow = { user_id: string };

const AdminDirectoryAccess = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .order("display_name", { ascending: true }),
      supabase.from("directory_access").select("user_id"),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setGranted(new Set(((a as AccessRow[]) ?? []).map((r) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return profiles;
    return profiles.filter((p) => (p.display_name ?? "").toLowerCase().includes(s));
  }, [profiles, q]);

  const grant = async (uid: string) => {
    const { error } = await supabase.from("directory_access").insert({ user_id: uid });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setGranted(new Set([...granted, uid]));
    toast({ title: "Access granted" });
  };

  const revoke = async (uid: string) => {
    const { error } = await supabase.from("directory_access").delete().eq("user_id", uid);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    const next = new Set(granted);
    next.delete(uid);
    setGranted(next);
    toast({ title: "Access revoked" });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-secondary flex items-center gap-2">
          <Lock className="h-7 w-7 text-primary" /> Directory access
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose which signed-in members may view the community directory. Admins always have
          access.
        </p>
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="pl-9"
        />
      </div>

      {loading && <p className="text-muted-foreground">Loading…</p>}

      <div className="grid gap-3">
        {filtered.map((p) => {
          const has = granted.has(p.user_id);
          return (
            <Card key={p.user_id} className="p-4 border-accent/30 flex items-center gap-3">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-accent/40"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-saffron text-primary-foreground flex items-center justify-center font-serif">
                  {(p.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.display_name ?? "Unnamed"}</p>
                {has && (
                  <Badge className="bg-accent text-accent-foreground text-[10px] mt-1">
                    Has access
                  </Badge>
                )}
              </div>
              {has ? (
                <Button variant="outline" size="sm" onClick={() => revoke(p.user_id)}>
                  <ShieldOff className="h-4 w-4 mr-1.5" /> Revoke
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => grant(p.user_id)}
                  className="bg-gradient-saffron text-primary-foreground"
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" /> Grant
                </Button>
              )}
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <UserPlus className="h-6 w-6 mx-auto mb-2 opacity-60" />
            No matching users.
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDirectoryAccess;
