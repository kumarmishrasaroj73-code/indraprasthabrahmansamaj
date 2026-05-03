import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalIcon, MapPin, Users, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  allow_rsvp: boolean;
};

const Events = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("events").select("*").order("event_date", { ascending: true });
    setItems((data as EventRow[]) ?? []);
    if (user) {
      const { data: r } = await supabase.from("event_rsvps")
        .select("event_id").eq("user_id", user.id);
      const map: Record<string, boolean> = {};
      (r ?? []).forEach((row: any) => { map[row.event_id] = true; });
      setRsvps(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    return {
      upcoming: items.filter((e) => new Date(e.event_date) >= now),
      past: items.filter((e) => new Date(e.event_date) < now).reverse(),
    };
  }, [items]);

  const rsvp = async (eventId: string) => {
    if (!user) return;
    const { error } = await supabase.from("event_rsvps")
      .upsert({ event_id: eventId, user_id: user.id, attendees: 1 }, { onConflict: "event_id,user_id" });
    if (error) toast({ title: "RSVP failed", description: error.message, variant: "destructive" });
    else { toast({ title: t("events.rsvped") }); setRsvps({ ...rsvps, [eventId]: true }); }
  };

  const card = (e: EventRow) => {
    const d = new Date(e.event_date);
    return (
      <Card key={e.id} className="overflow-hidden border-accent/30 hover:shadow-warm transition-smooth">
        {e.image_url && (
          <div className="aspect-[16/9] bg-muted">
            <img src={e.image_url} alt={e.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-16 rounded-xl bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center shadow-warm">
              <span className="text-[10px] uppercase">{d.toLocaleString("default", { month: "short" })}</span>
              <span className="font-serif text-2xl font-bold leading-none">{d.getDate()}</span>
              <span className="text-[10px]">{d.getFullYear()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-xl font-semibold text-secondary">{e.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              {e.location && (
                <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {e.location}
                </p>
              )}
            </div>
          </div>
          {e.description && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{e.description}</p>
          )}
          {e.allow_rsvp && new Date(e.event_date) >= new Date() && (
            <div className="mt-4 pt-3 border-t border-accent/30">
              {rsvps[e.id] ? (
                <Badge className="bg-accent text-accent-foreground"><Check className="h-3 w-3 mr-1" /> {t("events.rsvped")}</Badge>
              ) : user ? (
                <Button size="sm" onClick={() => rsvp(e.id)} className="bg-gradient-saffron text-primary-foreground">
                  <Users className="h-4 w-4 mr-2" /> {t("events.rsvp")}
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to="/auth">{t("events.signInToRsvp")}</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <CalIcon className="h-3 w-3" /> {t("events.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">{t("events.title")}</h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">{t("events.subtitle")}</p>
        <div className="mt-5">
          <Button asChild variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            <Link to="/events/cultural">
              <Sparkles className="h-4 w-4 mr-2" /> Utsav · Panchang, Festivals & Shlokas
            </Link>
          </Button>
        </div>
      </header>

      {loading && <p className="text-center text-muted-foreground py-12">Loading…</p>}

      {!loading && (
        <>
          <h2 className="font-serif text-2xl font-bold text-secondary mb-4">{t("events.upcoming")}</h2>
          {upcoming.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground mb-10">{t("events.noUpcoming")}</Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-12">{upcoming.map(card)}</div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="font-serif text-2xl font-bold text-secondary mb-4">{t("events.past")}</h2>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 opacity-80">{past.map(card)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Events;
