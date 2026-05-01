import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Search, MapPin, Briefcase, GraduationCap, Cake, Ruler, Lock, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

type Profile = {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  age: number | null;
  height_cm: number | null;
  gotra: string | null;
  education: string | null;
  profession: string | null;
  income_range: string | null;
  city: string | null;
  marital_status: string | null;
  about: string | null;
  photo_url: string | null;
};

const messageSchema = z
  .string()
  .trim()
  .max(500, { message: "Message must be 500 characters or less" });

const Matrimonial = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<string>("all");

  const [requestProfile, setRequestProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Public, sanitised view — no contact phone/email/DOB exposed.
    (supabase.from as any)("matrimonial_public")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Profile[] | null }) => {
        setItems(data ?? []);
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

  const openRequest = (p: Profile) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You must be signed in to request contact details.",
      });
      navigate("/auth?redirect=/matrimonial");
      return;
    }
    setRequestProfile(p);
    setMessage("");
  };

  const submitRequest = async () => {
    if (!requestProfile || !user) return;
    const parsed = messageSchema.safeParse(message);
    if (!parsed.success) {
      toast({
        title: "Invalid message",
        description: parsed.error.issues[0]?.message ?? "Please try again",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("matrimonial_contact_requests" as any).insert({
      profile_id: requestProfile.id,
      requester_id: user.id,
      message: parsed.data || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not send request",
        description: error.message.includes("duplicate")
          ? "You have already requested contact for this profile."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Request sent 🙏",
      description: "An administrator will review it shortly.",
    });
    setRequestProfile(null);
    setMessage("");
  };

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
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto mt-3 inline-flex items-center gap-1">
          <Lock className="h-3 w-3" /> Contact details are private. Send a request to receive them.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px] max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("matrimonial.searchPlaceholder")}
            className="pl-9"
            maxLength={120}
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
        {filtered.map((p) => (
          <Card key={p.id} className="overflow-hidden border-accent/30 hover:shadow-warm transition-smooth flex flex-col">
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
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-serif text-xl font-bold text-secondary">{p.full_name}</h3>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                {p.age !== null && (
                  <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {p.age} {t("matrimonial.years")}</span>
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
              <div className="mt-auto pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-accent/50"
                  onClick={() => openRequest(p)}
                >
                  <Send className="h-3.5 w-3.5 mr-2" /> Request Contact
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!requestProfile} onOpenChange={(o) => !o && setRequestProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request contact — {requestProfile?.full_name}</DialogTitle>
            <DialogDescription>
              An administrator will review your request and share contact details if approved.
              Please include a brief, respectful introduction.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Brief introduction (optional, max 500 chars)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestProfile(null)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Matrimonial;
