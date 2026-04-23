import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, Search, MapPin, Briefcase, GraduationCap, Phone, Mail, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Member = {
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
};

const Directory = () => {
  const { t } = useTranslation();
  const { user, canViewDirectory, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user || !canViewDirectory) {
      setLoading(false);
      return;
    }
    supabase
      .from("members")
      .select("*")
      .order("full_name", { ascending: true })
      .then(({ data }) => {
        setItems((data as Member[]) ?? []);
        setLoading(false);
      });
  }, [authLoading, user, canViewDirectory]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((m) =>
      [m.full_name, m.gotra, m.profession, m.education, m.city, m.locality, m.family_head]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(s))
    );
  }, [items, q]);

  if (authLoading) {
    return <p className="container py-20 text-center text-muted-foreground">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-secondary mb-3">
          {t("directory.title")}
        </h1>
        <p className="text-muted-foreground mb-6">
          The community directory is private. Please sign in with your member account to view it.
        </p>
        <Button asChild className="bg-gradient-saffron text-primary-foreground">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!canViewDirectory) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-secondary mb-3">
          Directory access required
        </h1>
        <p className="text-muted-foreground mb-2">
          For the privacy of our families, the member directory is visible only to administrators
          and members granted access.
        </p>
        <p className="text-muted-foreground mb-6">
          Please contact a Samaj administrator to request access.
        </p>
        <Button asChild variant="outline">
          <Link to="/">← Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <Users className="h-3 w-3" /> {t("directory.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("directory.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("directory.subtitle")}</p>
        <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Private — visible only to authorised members
        </p>
      </header>

      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("directory.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {loading && <p className="text-center text-muted-foreground py-12">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{t("directory.empty")}</p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.id} className="p-5 border-accent/30 hover:shadow-warm transition-smooth">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {m.photo_url ? (
                  <img
                    src={m.photo_url}
                    alt={m.full_name}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-accent/40"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-gradient-saffron flex items-center justify-center text-primary-foreground font-serif text-xl">
                    {m.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-semibold text-secondary truncate">
                  {m.full_name}
                </h3>
                {m.gotra && (
                  <Badge variant="outline" className="border-accent/50 mt-1 text-[10px]">
                    {t("directory.gotra")}: {m.gotra}
                  </Badge>
                )}
                {m.family_head && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("directory.familyHead")}: {m.family_head}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {m.profession && (
                <p className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> {m.profession}
                </p>
              )}
              {m.education && (
                <p className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" /> {m.education}
                </p>
              )}
              {(m.city || m.locality) && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {[m.locality, m.city].filter(Boolean).join(", ")}
                </p>
              )}
              {m.phone && (
                <a href={`tel:${m.phone}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="h-3.5 w-3.5 text-primary" /> {m.phone}
                </a>
              )}
              {m.email && (
                <a href={`mailto:${m.email}`} className="flex items-center gap-2 hover:text-primary truncate">
                  <Mail className="h-3.5 w-3.5 text-primary" /> {m.email}
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Directory;
