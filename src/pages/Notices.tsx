import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Calendar, Gavel, Users, ScrollText, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notices, type Notice } from "@/data/seed";

const categoryIcons: Record<Notice["category"], typeof FileText> = {
  meeting: Users,
  circular: ScrollText,
  decision: Gavel,
  legal: Scale,
};

const Notices = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Notice["category"] | "all">("all");

  const filtered = useMemo(() => {
    const list = filter === "all" ? notices : notices.filter((n) => n.category === filter);
    return [...list].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [filter]);

  const cats: Array<Notice["category"] | "all"> = ["all", "meeting", "circular", "decision", "legal"];

  return (
    <div className="container py-12 md:py-16 max-w-5xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <FileText className="h-3 w-3" /> {t("notices.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("notices.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground">{t("notices.subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {cats.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={filter === c ? "default" : "outline"}
            onClick={() => setFilter(c)}
            className={filter === c ? "bg-gradient-saffron text-primary-foreground" : "border-accent/40"}
          >
            {c === "all" ? t("notices.all") : t(`notices.categories.${c}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-5">
        {filtered.map((n) => {
          const Icon = categoryIcons[n.category];
          return (
            <Card
              key={n.id}
              className="p-6 transition-smooth hover:shadow-warm hover:-translate-y-0.5 border-accent/30"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-gradient-warm border border-accent/40 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="border-accent/50 text-accent-foreground bg-accent/10">
                      {t(`notices.categories.${n.category}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg md:text-xl font-semibold text-secondary mb-1">
                    {n.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{n.description}</p>
                </div>
                {n.attachment && (
                  <Button asChild variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground self-start md:self-center">
                    <a href={n.attachment} download>
                      <Download className="h-4 w-4 mr-2" /> {t("notices.download")}
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Notices;
