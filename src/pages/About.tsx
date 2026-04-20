import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Compass, Eye, Heart, GraduationCap, HandHeart, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import i18n from "@/i18n";

type IntroRow = {
  id: string;
  section_key: string;
  language: string;
  title: string;
  body: string;
  display_order: number;
};

const sectionStyles: Record<string, string> = {
  about: "ornate-border",
  history: "bg-gradient-warm",
  mission: "border-accent/40",
  vision: "border-accent/40",
};

const sectionIcons: Record<string, typeof Heart> = {
  about: Heart,
  history: BookOpen,
  mission: Compass,
  vision: Eye,
};

const About = () => {
  const { t } = useTranslation();
  const [sections, setSections] = useState<IntroRow[]>([]);

  useEffect(() => {
    const lang = i18n.language || "en";
    const load = async () => {
      const { data } = await supabase
        .from("intro_content")
        .select("*")
        .eq("language", lang)
        .order("display_order");
      if (data && data.length > 0) {
        setSections(data as IntroRow[]);
      } else {
        // Fallback to English
        const { data: enData } = await supabase
          .from("intro_content")
          .select("*")
          .eq("language", "en")
          .order("display_order");
        setSections((enData as IntroRow[]) ?? []);
      }
    };
    load();
    i18n.on("languageChanged", load);
    return () => {
      i18n.off("languageChanged", load);
    };
  }, []);

  const values = [
    { icon: BookOpen, key: "dharma" },
    { icon: GraduationCap, key: "vidya" },
    { icon: HandHeart, key: "seva" },
    { icon: Users, key: "ekta" },
  ] as const;

  return (
    <div className="container py-12 md:py-16 max-w-5xl">
      <header className="text-center mb-12">
        <div className="font-sanskrit text-3xl text-accent mb-2">॥ श्री गणेशाय नमः ॥</div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("about.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full" />
      </header>

      <div className="space-y-6 mb-8">
        {sections.map((s) => {
          const Icon = sectionIcons[s.section_key] ?? Heart;
          const style = sectionStyles[s.section_key] ?? "border-accent/30";
          return (
            <Card key={s.id} className={`p-8 md:p-10 ${style}`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold text-secondary">{s.title}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{s.body}</p>
            </Card>
          );
        })}
      </div>

      <section>
        <h2 className="font-serif text-3xl font-bold text-secondary text-center mb-8">
          {t("about.valuesTitle")}
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, key }) => (
            <Card key={key} className="p-6 text-center transition-smooth hover:shadow-warm hover:-translate-y-1 border-accent/30">
              <div className="mx-auto w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center mb-4 shadow-gold">
                <Icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <p className="font-serif text-base font-semibold text-secondary">
                {t(`about.values.${key}`)}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default About;
