import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  MapPin,
  Clock,
  Video,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Meeting = {
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
};

const typeLabel: Record<Meeting["meeting_type"], string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

const Meetings = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("meetings")
      .select("*")
      .order("scheduled_at", { ascending: true })
      .then(({ data }) => {
        setItems((data as Meeting[]) ?? []);
        setLoading(false);
      });
  }, []);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    return {
      upcoming: items.filter(
        (m) => new Date(m.scheduled_at) >= now && m.status !== "cancelled"
      ),
      past: items
        .filter(
          (m) => new Date(m.scheduled_at) < now || m.status === "completed" || m.status === "cancelled"
        )
        .reverse(),
    };
  }, [items]);

  const card = (m: Meeting) => {
    const d = new Date(m.scheduled_at);
    const cancelled = m.status === "cancelled";
    return (
      <Card
        key={m.id}
        className={`overflow-hidden border-accent/30 hover:shadow-warm transition-smooth ${
          cancelled ? "opacity-70" : ""
        }`}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-16 rounded-xl bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center shadow-warm">
              <span className="text-[10px] uppercase">
                {d.toLocaleString("default", { month: "short" })}
              </span>
              <span className="font-serif text-2xl font-bold leading-none">{d.getDate()}</span>
              <span className="text-[10px]">{d.getFullYear()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-xl font-semibold text-secondary">{m.title}</h3>
                <Badge variant="outline" className="border-accent/50 text-[10px]">
                  {typeLabel[m.meeting_type]}
                </Badge>
                {m.status === "completed" && (
                  <Badge className="bg-accent text-accent-foreground text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                )}
                {m.status === "cancelled" && (
                  <Badge variant="destructive" className="text-[10px]">
                    <XCircle className="h-3 w-3 mr-1" /> Cancelled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {d.toLocaleString([], {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {m.duration_minutes} min
              </p>
              {m.location && (
                <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> {m.location}
                </p>
              )}
            </div>
          </div>

          {m.agenda && (
            <div className="mt-4 pt-3 border-t border-accent/30">
              <p className="text-[11px] uppercase tracking-widest text-primary mb-1">Agenda</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{m.agenda}</p>
            </div>
          )}

          {m.minutes && (
            <div className="mt-4 pt-3 border-t border-accent/30">
              <p className="text-[11px] uppercase tracking-widest text-primary mb-1 inline-flex items-center gap-1">
                <FileText className="h-3 w-3" /> Minutes
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-6">
                {m.minutes}
              </p>
            </div>
          )}

          {m.meeting_link && !cancelled && (
            <div className="mt-4">
              <Button
                asChild
                size="sm"
                className="bg-gradient-saffron text-primary-foreground"
              >
                <a href={m.meeting_link} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-2" /> Join meeting
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-80" />
                </a>
              </Button>
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
          <CalendarDays className="h-3 w-3" /> {t("meetings.title", "Meetings")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("meetings.title", "Meetings")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t(
            "meetings.subtitle",
            "Scheduled Samaj meetings — agenda, timings, location, and minutes of past sessions."
          )}
        </p>
      </header>

      {loading && <p className="text-center text-muted-foreground py-12">Loading…</p>}

      {!loading && (
        <>
          <h2 className="font-serif text-2xl font-bold text-secondary mb-4">
            {t("meetings.upcoming", "Upcoming meetings")}
          </h2>
          {upcoming.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground mb-10">
              {t("meetings.noUpcoming", "No upcoming meetings scheduled.")}
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 mb-12">{upcoming.map(card)}</div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="font-serif text-2xl font-bold text-secondary mb-4">
                {t("meetings.past", "Past meetings")}
              </h2>
              <div className="grid gap-5 md:grid-cols-2">{past.map(card)}</div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Meetings;
