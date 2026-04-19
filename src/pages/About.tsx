import { useTranslation } from "react-i18next";
import { BookOpen, Compass, Eye, Heart, GraduationCap, HandHeart, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const About = () => {
  const { t } = useTranslation();

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

      <Card className="p-8 md:p-10 mb-8 ornate-border">
        <div className="flex items-center gap-3 mb-3">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl font-bold text-secondary">{t("about.aboutTitle")}</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">{t("about.aboutBody")}</p>
      </Card>

      <Card className="p-8 md:p-10 mb-8 bg-gradient-warm">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl font-bold text-secondary">{t("about.historyTitle")}</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">{t("about.historyBody")}</p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-8 border-accent/40">
          <div className="flex items-center gap-3 mb-3">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-bold text-secondary">{t("about.missionTitle")}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">{t("about.missionBody")}</p>
        </Card>
        <Card className="p-8 border-accent/40">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-2xl font-bold text-secondary">{t("about.visionTitle")}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">{t("about.visionBody")}</p>
        </Card>
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
