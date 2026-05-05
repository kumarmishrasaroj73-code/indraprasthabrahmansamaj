import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bell, Calendar, Users, HandHeart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import hero from "@/assets/parshuram.jpg";
import logo from "@/assets/logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { DailyShloka } from "@/components/DailyShloka";

type Announcement = {
  id: string;
  title: string;
  description: string;
  date: string;
  urgent: boolean;
};

const Home = () => {
  const { t } = useTranslation();
  const [top, setTop] = useState<Announcement[]>([]);

  useEffect(() => {
    supabase
      .from("announcements")
      .select("*")
      .order("date", { ascending: false })
      .limit(3)
      .then(({ data }) => setTop((data as Announcement[]) ?? []));
  }, []);

  const quick = [
    { to: "/notices", icon: FileText, key: "notices" },
    { to: "/announcements", icon: Calendar, key: "events" },
    { to: "/about", icon: Users, key: "directory" },
    { to: "/donate", icon: HandHeart, key: "donate" },
  ] as const;

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-warm border-b border-accent/30">
        <div className="container py-10 md:py-16">
          <div className="grid items-center gap-8 md:gap-12 md:grid-cols-[auto_1fr_auto]">
            {/* Logo on the left */}
            <div className="flex justify-center md:justify-start">
              <img
                src={logo}
                alt="Indraprastha Brahman Samaj logo"
                className="h-32 w-32 md:h-44 md:w-44 rounded-full object-cover ring-4 ring-accent shadow-warm"
              />
            </div>

            {/* Brand text in the middle */}
            <div className="text-center md:text-left">
              <div className="font-sanskrit text-2xl md:text-3xl text-primary mb-2">॥ ॐ ॥</div>
              <p className="uppercase tracking-[0.3em] text-xs md:text-sm text-accent-foreground/80 mb-3">
                {t("hero.welcome")}
              </p>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-secondary mb-4">
                {t("brand.name")}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-xl mx-auto md:mx-0">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button asChild size="lg" className="bg-gradient-saffron text-primary-foreground shadow-warm">
                  <Link to="/about">
                    {t("hero.ctaAbout")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-accent">
                  <Link to="/donate">
                    <HandHeart className="mr-2 h-4 w-4" /> {t("hero.ctaDonate")}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Parshuram photo on the right — no text overlay */}
            <div className="flex justify-center md:justify-end">
              <img
                src={hero}
                alt="Bhagwan Parshuram"
                className="w-56 md:w-72 lg:w-80 rounded-2xl object-cover shadow-warm ring-2 ring-accent/40"
                width={640}
                height={640}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="container py-16 md:py-20 text-center max-w-3xl">
        <div className="inline-block px-4 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs uppercase tracking-widest mb-4">
          {t("home.introTitle")}
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-secondary mb-4">
          {t("home.introTitle")}
        </h2>
        <div className="w-24 h-1 bg-gradient-gold mx-auto mb-6 rounded-full" />
        <p className="text-muted-foreground leading-relaxed">{t("home.introBody")}</p>
      </section>

      {/* Latest Announcements */}
      <section className="container py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-secondary flex items-center gap-3">
              <Bell className="h-7 w-7 text-primary" /> {t("home.latestAnnouncements")}
            </h2>
          </div>
          <Link to="/announcements" className="text-sm text-primary hover:underline whitespace-nowrap">
            {t("home.viewAll")} →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {top.map((a) => (
            <Card
              key={a.id}
              className={`p-6 transition-smooth hover:-translate-y-1 hover:shadow-warm border-accent/30 ${
                a.urgent ? "ornate-border" : ""
              }`}
            >
              {a.urgent && (
                <Badge className="mb-3 bg-destructive text-destructive-foreground">
                  {t("home.urgentBadge")}
                </Badge>
              )}
              <div className="text-xs text-muted-foreground mb-2">
                {new Date(a.date).toLocaleDateString()}
              </div>
              <h3 className="font-serif text-xl font-semibold text-secondary mb-2">
                {a.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3">{a.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Daily Shloka */}
      <section className="container pb-4">
        <DailyShloka />
      </section>

      {/* Quick Links */}
      <section className="container py-16">
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-secondary text-center mb-2">
          {t("home.quickLinks")}
        </h2>
        <div className="w-24 h-1 bg-gradient-gold mx-auto mb-10 rounded-full" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quick.map(({ to, icon: Icon, key }) => (
            <Link
              key={key}
              to={to}
              className="group rounded-xl border-2 border-accent/30 bg-card p-6 text-center transition-smooth hover:border-primary hover:shadow-warm hover:-translate-y-1"
            >
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-saffron flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth shadow-warm">
                <Icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-secondary mb-1">
                {t(`home.quick.${key}`)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t(`home.quick.${key}Desc`)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
