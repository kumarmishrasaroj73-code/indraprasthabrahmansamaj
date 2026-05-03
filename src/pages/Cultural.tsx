import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sun, Moon, Sparkles, Flame, MapPin, BookOpen, CalendarDays, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Festival = { name: string; date: string; description: string };
type Shloka = { sanskrit: string; meaning: string; source: string };
type Temple = { name: string; city: string; deity: string };

const FESTIVALS: Festival[] = [
  { name: "Akshaya Tritiya", date: "2026-05-19", description: "Auspicious day for new beginnings, charity, and worship of Lord Vishnu & Goddess Lakshmi." },
  { name: "Ganga Dussehra", date: "2026-05-26", description: "Celebrates the descent of Goddess Ganga to Earth — bathing in holy rivers is considered sacred." },
  { name: "Guru Purnima", date: "2026-07-29", description: "Day to honour spiritual and academic teachers — special pujas in homes and temples." },
  { name: "Raksha Bandhan", date: "2026-08-28", description: "The bond of love and protection between brothers and sisters." },
  { name: "Janmashtami", date: "2026-09-04", description: "Birth of Lord Krishna — celebrated with bhajans, fasting and midnight aarti." },
  { name: "Navratri & Dussehra", date: "2026-10-12", description: "Nine nights of Devi worship culminating in the victory of good over evil." },
  { name: "Diwali", date: "2026-11-08", description: "Festival of lights — Lakshmi Pujan, diyas and family gatherings." },
];

const SHLOKAS: Shloka[] = [
  {
    sanskrit: "ॐ सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।\nसर्वे भद्राणि पश्यन्तु मा कश्चित् दुःखभाग्भवेत्॥",
    meaning: "May all be happy, may all be free from illness, may all see auspiciousness, may none suffer.",
    source: "Bṛhadāraṇyaka Upaniṣad",
  },
  {
    sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",
    meaning: "You have a right to action alone, never to its fruits. Do not be motivated by results, nor be attached to inaction.",
    source: "Bhagavad Gītā 2.47",
  },
  {
    sanskrit: "वसुधैव कुटुम्बकम्",
    meaning: "The whole world is one family.",
    source: "Mahā Upaniṣad 6.71",
  },
  {
    sanskrit: "सत्यमेव जयते नानृतं\nसत्येन पन्था विततो देवयानः।",
    meaning: "Truth alone triumphs, not falsehood. By truth is laid the divine path.",
    source: "Muṇḍaka Upaniṣad 3.1.6",
  },
];

const TEMPLES: Temple[] = [
  { name: "Chhatarpur Mandir", city: "Delhi", deity: "Maa Katyayani" },
  { name: "Akshardham", city: "Delhi", deity: "Swaminarayan" },
  { name: "Birla Mandir (Lakshmi Narayan)", city: "Delhi", deity: "Lakshmi Narayan" },
  { name: "Kalkaji Mandir", city: "Delhi", deity: "Maa Kalka" },
  { name: "Yogmaya Mandir", city: "Delhi", deity: "Yogmaya Devi" },
  { name: "Gauri Shankar Mandir", city: "Chandni Chowk, Delhi", deity: "Lord Shiva" },
];

const TITHIS = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"];
const NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];

const Cultural = () => {
  const { t } = useTranslation();
  const [date] = useState(new Date());

  const panchang = useMemo(() => {
    const day = date.getDate();
    const sunrise = new Date(date); sunrise.setHours(5, 42, 0);
    const sunset = new Date(date); sunset.setHours(18, 58, 0);
    return {
      tithi: TITHIS[day % TITHIS.length],
      nakshatra: NAKSHATRAS[day % NAKSHATRAS.length],
      paksha: day <= 15 ? "Shukla Paksha" : "Krishna Paksha",
      sunrise: sunrise.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sunset: sunset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      vikram: 2082 + (date.getMonth() >= 3 ? 1 : 0),
      shaka: date.getFullYear() - 78,
    };
  }, [date]);

  return (
    <div className="container py-10 md:py-14 max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/events"><ArrowLeft className="h-4 w-4 mr-1" /> {t("nav.events")}</Link>
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
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Moon, label: "Tithi", value: `${panchang.tithi} (${panchang.paksha})` },
                { icon: Sparkles, label: "Nakshatra", value: panchang.nakshatra },
                { icon: Flame, label: "Paksha", value: panchang.paksha },
                { icon: Sun, label: "Sunrise", value: panchang.sunrise },
                { icon: Moon, label: "Sunset", value: panchang.sunset },
                { icon: CalendarDays, label: "Ritu", value: "Grishma (Summer)" },
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
              Indicative values for Delhi. Consult your family purohit for muhurta-specific guidance.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="festivals">
          <div className="grid md:grid-cols-2 gap-4">
            {FESTIVALS.map((f) => {
              const d = new Date(f.date);
              return (
                <Card key={f.name} className="p-5 border-accent/30 hover:shadow-warm transition-smooth">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-16 rounded-xl bg-gradient-saffron text-primary-foreground flex flex-col items-center justify-center shadow-warm">
                      <span className="text-[10px] uppercase">{d.toLocaleString("default", { month: "short" })}</span>
                      <span className="font-serif text-2xl font-bold leading-none">{d.getDate()}</span>
                      <span className="text-[10px]">{d.getFullYear()}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg font-semibold text-secondary">{f.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{f.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="shlokas">
          <div className="grid md:grid-cols-2 gap-5">
            {SHLOKAS.map((s, i) => (
              <Card key={i} className="p-6 border-accent/30 bg-gradient-to-br from-background to-accent/5">
                <BookOpen className="h-5 w-5 text-primary mb-3" />
                <pre className="font-serif text-base md:text-lg text-secondary whitespace-pre-wrap leading-relaxed">{s.sanskrit}</pre>
                <p className="text-sm text-muted-foreground mt-4 italic">"{s.meaning}"</p>
                <Badge variant="outline" className="mt-3 text-xs">— {s.source}</Badge>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="temples">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLES.map((tm) => (
              <Card key={tm.name} className="p-5 border-accent/30 hover:shadow-warm transition-smooth">
                <Flame className="h-5 w-5 text-primary mb-2" />
                <h3 className="font-serif text-lg font-semibold text-secondary">{tm.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{tm.deity}</p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-2">
                  <MapPin className="h-3 w-3 text-primary" /> {tm.city}
                </p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cultural;
