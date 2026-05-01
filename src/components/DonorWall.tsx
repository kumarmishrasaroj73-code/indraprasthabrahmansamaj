import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Donation = {
  id: string;
  donor_name: string;
  amount: number;
  currency: string;
  message: string | null;
  donated_on: string;
  is_anonymous: boolean;
};

export const DonorWall = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use the public, anonymised view — donor names are masked server-side when anonymous.
    supabase.from("donations_public" as any).select("*").order("donated_on", { ascending: false }).limit(60)
      .then(({ data }) => { setItems((data as Donation[]) ?? []); setLoading(false); });
  }, []);

  const total = items.reduce((s, d) => s + Number(d.amount), 0);
  const inr = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl md:text-3xl font-bold text-secondary text-center mb-2">
        {t("donorWall.title")}
      </h2>
      <div className="w-20 h-1 bg-gradient-gold mx-auto mb-6 rounded-full" />

      <Card className="p-6 ornate-border text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          {t("donorWall.totalRaised")}
        </p>
        <p className="font-serif text-4xl md:text-5xl font-bold text-primary inline-flex items-center gap-1">
          <IndianRupee className="h-8 w-8" /> {inr(total)}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {t("donorWall.fromDonors", { count: items.length })}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <Card key={d.id} className="p-4 border-accent/30 hover:shadow-warm transition-smooth">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-saffron flex items-center justify-center text-primary-foreground">
                <Heart className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-secondary truncate">
                  {d.is_anonymous ? t("donorWall.anonymous") : d.donor_name}
                </p>
                <p className="text-sm text-primary font-semibold">
                  ₹{inr(Number(d.amount))}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {new Date(d.donated_on).toLocaleDateString()}
                  </span>
                </p>
                {d.message && (
                  <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">"{d.message}"</p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
