import { useTranslation } from "react-i18next";
import { Bell, AlertTriangle, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { announcements } from "@/data/seed";

const Announcements = () => {
  const { t } = useTranslation();
  const sorted = [...announcements].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <Bell className="h-3 w-3" /> {t("announcements.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("announcements.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground">{t("announcements.subtitle")}</p>
      </header>

      <div className="space-y-5">
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t("announcements.empty")}</p>
        )}
        {sorted.map((a) => (
          <Card
            key={a.id}
            className={`p-6 md:p-7 transition-smooth hover:shadow-warm ${
              a.urgent ? "ornate-border" : "border-accent/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  a.urgent
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {a.urgent ? <AlertTriangle className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {a.urgent && (
                    <Badge className="bg-destructive text-destructive-foreground">
                      {t("announcements.urgent")}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t("announcements.posted")} {new Date(a.date).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-secondary mb-2">
                  {a.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{a.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Announcements;
