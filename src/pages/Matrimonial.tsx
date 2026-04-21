import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Search, MapPin, Briefcase, GraduationCap, Phone, Mail, Cake, Ruler } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
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
};

const ageFrom = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const Matrimonial = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("matrimonial_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as Profile[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((p) => {
      if (gender !== "all" && p.gender !== gender) return false;
      if (!s) return true;
      return [p.full_name, p.gotra, p.profession, p.education, p.city, p.about]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(s));
    });
  }, [items, q, gender]);

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <Heart className="h-3 w-3" /> {t("matrimonial.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("matrimonial.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("matrimonial.subtitle")}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px] max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("matrimonial.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("matrimonial.allGenders")}</SelectItem>
            <SelectItem value="male">{t("matrimonial.male")}</SelectItem>
            <SelectItem value="female">{t("matrimonial.female")}</SelectItem>
            <SelectItem value="other">{t("matrimonial.other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-center text-muted-foreground py-12">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{t("matrimonial.empty")}</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const age = ageFrom(p.date_of_birth);
          return (
            <Card key={p.id} className="overflow-hidden border-accent/30 hover:shadow-warm transition-smooth">
              <div className="aspect-[4/3] bg-gradient-warm relative">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-serif text-accent/50">
                    {p.full_name.charAt(0)}
                  </div>
                )}
                <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground capitalize">
                  {t(`matrimonial.${p.gender}`)}
                </Badge>
              </div>
              <div className="p-5">
                <h3 className="font-serif text-xl font-bold text-secondary">{p.full_name}</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                  {age !== null && (
                    <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {age} {t("matrimonial.years")}</span>
                  )}
                  {p.height_cm && (
                    <span className="inline-flex items-center gap-1"><Ruler className="h-3 w-3" /> {p.height_cm} cm</span>
                  )}
                  {p.gotra && <Badge variant="outline" className="border-accent/50 text-[10px]">{p.gotra}</Badge>}
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {p.education && (
                    <p className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5 text-primary" /> {p.education}</p>
                  )}
                  {p.profession && (
                    <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-primary" /> {p.profession}{p.income_range ? ` · ${p.income_range}` : ""}</p>
                  )}
                  {p.city && (
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> {p.city}</p>
                  )}
                </div>
                {p.about && <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{p.about}</p>}
                {(p.contact_phone || p.contact_email) && (
                  <div className="mt-4 pt-3 border-t border-accent/30 space-y-1 text-sm">
                    {p.contact_name && <p className="text-xs text-muted-foreground">{t("matrimonial.contact")}: <span className="text-foreground font-medium">{p.contact_name}</span></p>}
                    {p.contact_phone && (
                      <a href={`tel:${p.contact_phone}`} className="flex items-center gap-2 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {p.contact_phone}
                      </a>
                    )}
                    {p.contact_email && (
                      <a href={`mailto:${p.contact_email}`} className="flex items-center gap-2 text-primary hover:underline truncate">
                        <Mail className="h-3.5 w-3.5" /> {p.contact_email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Matrimonial;
