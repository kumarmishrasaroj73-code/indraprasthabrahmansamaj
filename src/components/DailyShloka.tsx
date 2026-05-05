import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const sb = supabase as any;

type Shloka = { id: string; sanskrit: string; meaning_en: string | null; meaning_hi: string | null; source: string | null };

export const DailyShloka = () => {
  const { i18n } = useTranslation();
  const isHi = i18n.language?.startsWith("hi");
  const [shloka, setShloka] = useState<Shloka | null>(null);

  useEffect(() => {
    sb.from("cultural_shlokas")
      .select("*")
      .eq("is_published", true)
      .order("display_order")
      .then(({ data }: any) => {
        if (!data?.length) return;
        const dayIdx = Math.floor(Date.now() / 86400000) % data.length;
        setShloka(data[dayIdx]);
      });
  }, []);

  if (!shloka) return null;
  const meaning = isHi && shloka.meaning_hi ? shloka.meaning_hi : shloka.meaning_en;

  return (
    <Card className="p-6 md:p-8 border-accent/30 bg-gradient-to-br from-background to-accent/10">
      <div className="flex items-center gap-2 text-primary mb-3">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest font-medium">Shloka of the Day</span>
      </div>
      <pre className="font-serif text-base md:text-xl text-secondary whitespace-pre-wrap leading-relaxed">{shloka.sanskrit}</pre>
      {meaning && <p className="text-sm text-muted-foreground mt-4 italic">"{meaning}"</p>}
      <div className="flex items-center justify-between mt-4">
        {shloka.source && <span className="text-xs text-primary">— {shloka.source}</span>}
        <Link to="/cultural" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <BookOpen className="h-3 w-3" /> More shlokas
        </Link>
      </div>
    </Card>
  );
};
