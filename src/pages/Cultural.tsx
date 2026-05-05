import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sun, Moon, Sparkles, Flame, MapPin, BookOpen, CalendarDays, ArrowLeft, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CITIES, City, computePanchang } from "@/lib/panchang";
import { toast } from "@/hooks/use-toast";

const sb = supabase as any;

type Festival = { id: string; name_en: string; name_hi: string | null; date: string; description_en: string | null; description_hi: string | null };
type Shloka = { id: string; sanskrit: string; meaning_en: string | null; meaning_hi: string | null; source: string | null };
type Temple = { id: string; name_en: string; name_hi: string | null; deity_en: string | null; deity_hi: string | null; city: string | null };

const Cultural = () => {
  const { i18n } = useTranslation();
  const isHi = i18n.language?.startsWith("hi");
  const [date] = useState(new Date());

  const [city, setCity] = useState<City>(() => {
    const saved = localStorage.getItem("panchang-city");
    return CITIES.find(c => c.name === saved) ?? CITIES[0];
  });
  useEffect(() => { localStorage.setItem("panchang-city", city.name); }, [city]);

  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [shlokas, setShlokas] = useState<Shloka[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);

  useEffect(() => {
    sb.from("cultural_festivals").select("*").eq("is_published", true).order("date").then(({ data }: any) => setFestivals(data ?? []));
    sb.from("cultural_shlokas").select("*").eq("is_published", true).order("display_order").then(({ data }: any) => setShlokas(data ?? []));
    sb.from("cultural_temples").select("*").eq("is_published", true).order("display_order").then(({ data }: any) => setTemples(data ?? []));
  }, []);

  const panchang = useMemo(() => computePanchang(date, city), [date, city]);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast({ title: "Geolocation not supported" });
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const nearest = CITIES.reduce((best, c) => {
          const d = Math.hypot(c.lat - latitude, c.lon - longitude);
          return d < best.d ? { c, d } : best;
        }, { c: CITIES[0], d: Infinity });
        setCity(nearest.c);
        toast({ title: `Set to ${nearest.c.name}` });
      },
      () => toast({ title: "Could not detect location", variant: "destructive" })
    );
  };

  return (
    <div className="container py-10 md:py-14 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/events"><ArrowLeft className="h-4 w-4 mr-1" /> Events</Link>
      </Button>

      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <Sparkles className="h-3 w-3" /> Cultural & Spiritual
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">Utsav · उत्सव</h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Daily Panchang, sacred shlokas, festival calendar and temples — a small window into our living tradition.
        </p>
      </header>

      <Tabs defaultValue="panchang" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto mb-8">
          <TabsTrigger value="panchang">Panchang</TabsTrigger>
          <TabsTrigger value="festivals">Festivals</TabsTrigger>
          <TabsTrigger value="shlokas">Shlokas</TabsTrigger>
          <TabsTrigger value="temples">Temples</TabsTrigger>
        </TabsList>

        <TabsContent value="panchang">
          <Card className="p-6 md:p-8 border-accent/30">
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">{date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <h2 className="font-serif text-2xl text-secondary mt-1">Today's Panchang</h2>
              <p className="text-xs text-muted-foreground mt-1">Vikram Samvat {panchang.vikram} · Shaka {panchang.shaka}</p>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Select value={city.name} onValueChange={(name) => setCity(CITIES.find(c => c.name === name) ?? CITIES[0])}>
                  <SelectTrigger className="w-44">
                    <MapPin className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={detectLocation}>
                  <Navigation className="h-3 w-3 mr-1" /> Detect
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Moon, label: "Tithi", value: `${panchang.tithi} (${panchang.paksha})` },
                { icon: Sparkles, label: "Nakshatra", value: panchang.nakshatra },
                { icon: Flame, label: "Yoga", value: panchang.yoga },
                { icon: CalendarDays, label: "Karana", value: panchang.karana },
                { icon: Sun, label: "Sunrise", value: panchang.sunrise },
                { icon: Moon, label: "Sunset", value: panchang.sunset },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-accent/20">
                  <Icon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="font-medium text-secondary">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-6 italic">
              Computed for {city.name} ({city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°). Consult your purohit for muhurta-specific guidance.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="festivals">
          <div className="grid md:grid-cols-2 gap-4">
            {festivals.map((f) => {
              const d = new Date(f.date);
              const name = isHi && f.name_hi ? f.name_hi : f.name_en;
              const desc = isHi && f.description_hi ? f.description_hi : f.description_en;
              return (
                <Card key={f.id} className="p-5 border-accent/30 hover:shadow-warm transition-smooth">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-16 rounded-xl bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center shadow-warm">
                      <span className="text-[10px] uppercase">{d.toLocaleString("default", { month: "short" })}</span>
                      <span className="font-serif text-2xl font-bold leading-none">{d.getDate()}</span>
                      <span className="text-[10px]">{d.getFullYear()}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-semibold text-secondary">{name}</h3>
                      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
                    </div>
                  </div>
                </Card>
              );
            })}
            {festivals.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">No festivals listed yet.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="shlokas">
          <div className="grid md:grid-cols-2 gap-5">
            {shlokas.map((s) => {
              const meaning = isHi && s.meaning_hi ? s.meaning_hi : s.meaning_en;
              return (
                <Card key={s.id} className="p-6 border-accent/30 bg-gradient-to-br from-background to-accent/5">
                  <BookOpen className="h-5 w-5 text-primary mb-3" />
                  <pre className="font-serif text-base md:text-lg text-secondary whitespace-pre-wrap leading-relaxed">{s.sanskrit}</pre>
                  {meaning && <p className="text-sm text-muted-foreground mt-4 italic">"{meaning}"</p>}
                  {s.source && <Badge variant="outline" className="mt-3 text-xs">— {s.source}</Badge>}
                </Card>
              );
            })}
            {shlokas.length === 0 && <Card className="p-8 text-center text-muted-foreground md:col-span-2">No shlokas listed yet.</Card>}
          </div>
        </TabsContent>

        <TabsContent value="temples">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {temples.map((tm) => {
              const name = isHi && tm.name_hi ? tm.name_hi : tm.name_en;
              const deity = isHi && tm.deity_hi ? tm.deity_hi : tm.deity_en;
              return (
                <Card key={tm.id} className="p-5 border-accent/30 hover:shadow-warm transition-smooth">
                  <Flame className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-serif text-lg font-semibold text-secondary">{name}</h3>
                  {deity && <p className="text-sm text-muted-foreground mt-1">{deity}</p>}
                  {tm.city && (
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-2">
                      <MapPin className="h-3 w-3 text-primary" /> {tm.city}
                    </p>
                  )}
                </Card>
              );
            })}
            {temples.length === 0 && <Card className="p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">No temples listed yet.</Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cultural;
