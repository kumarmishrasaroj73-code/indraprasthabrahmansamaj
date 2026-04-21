import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  HandHeart, Copy, Check, QrCode, Smartphone, CreditCard, Building2,
  GraduationCap, Sparkles, Users, Landmark,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DonorWall } from "@/components/DonorWall";

const PRESETS = [101, 251, 501, 1001, 2100, 5100];

const METHODS = [
  { id: "phonepe", icon: Smartphone, color: "from-purple-500 to-purple-700" },
  { id: "paytm", icon: Smartphone, color: "from-blue-500 to-blue-700" },
  { id: "gpay", icon: Smartphone, color: "from-green-500 to-emerald-600" },
  { id: "bhim", icon: Smartphone, color: "from-orange-500 to-red-600" },
  { id: "upi", icon: QrCode, color: "from-amber-500 to-yellow-600" },
  { id: "stripe", icon: CreditCard, color: "from-indigo-500 to-violet-700" },
  { id: "bank", icon: Building2, color: "from-secondary to-secondary/70" },
] as const;

const UPI_ID = "indraprastha.samaj@upi";

const Donate = () => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<number>(501);
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<string>("phonepe");
  const [copied, setCopied] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t("donate.copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Indraprastha%20Brahman%20Samaj&am=${finalAmount}&cu=INR&tn=Donation`;

  const impacts = [
    { icon: GraduationCap, key: "education" },
    { icon: Sparkles, key: "festivals" },
    { icon: Users, key: "welfare" },
    { icon: Landmark, key: "heritage" },
  ] as const;

  return (
    <div className="container py-12 md:py-16 max-w-5xl">
      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-saffron shadow-warm mb-4 animate-float">
          <HandHeart className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="font-sanskrit text-2xl text-accent mb-2">॥ दानं परमं धर्मम् ॥</div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">
          {t("donate.title")}
        </h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground max-w-xl mx-auto">{t("donate.subtitle")}</p>
      </header>

      {/* Amount selection */}
      <Card className="p-6 md:p-8 mb-8 ornate-border">
        <Label className="text-base font-serif font-semibold text-secondary mb-4 block">
          {t("donate.chooseAmount")}
        </Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setAmount(p); setCustom(""); }}
              className={`relative py-3 rounded-lg font-semibold transition-smooth ${
                !custom && amount === p
                  ? "bg-gradient-saffron text-primary-foreground shadow-warm scale-105"
                  : "bg-muted text-foreground hover:bg-accent/20"
              }`}
            >
              ₹{p}
            </button>
          ))}
        </div>
        <Label className="text-sm text-muted-foreground mb-2 block">
          {t("donate.customAmount")}
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
          <Input
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="0"
            className="pl-8 h-12 text-lg border-accent/40"
            min={1}
          />
        </div>
      </Card>

      {/* Method selection */}
      <h2 className="font-serif text-2xl font-bold text-secondary text-center mb-6">
        {t("donate.chooseMethod")}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`relative p-4 rounded-xl border-2 transition-smooth text-center ${
                active
                  ? "border-primary shadow-warm bg-card -translate-y-1"
                  : "border-accent/30 bg-card hover:border-accent"
              }`}
            >
              <div className={`mx-auto w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-2`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs font-medium text-foreground">{t(`donate.methods.${m.id}`)}</div>
            </button>
          );
        })}
      </div>

      {/* Payment panel */}
      <Card className="p-6 md:p-10 mb-12 bg-gradient-warm border-accent/40">
        {(method === "phonepe" || method === "paytm" || method === "gpay" || method === "bhim" || method === "upi") && (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center">
              <div className="mx-auto w-56 h-56 rounded-2xl bg-card border-4 border-accent/40 shadow-warm flex items-center justify-center p-4">
                {/* QR placeholder */}
                <div className="w-full h-full rounded-lg bg-[radial-gradient(hsl(var(--secondary))_1px,transparent_1px)] [background-size:8px_8px] flex items-center justify-center">
                  <div className="bg-card px-3 py-2 rounded shadow text-xs font-mono text-secondary">
                    QR · ₹{finalAmount}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("donate.scanQr")}</p>
              <Button asChild className="mt-3 bg-gradient-saffron text-primary-foreground hover:opacity-90">
                <a href={upiLink}>Open in UPI App</a>
              </Button>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("donate.upiId")}
              </Label>
              <div className="flex items-center gap-2 mt-2 mb-6">
                <code className="flex-1 px-4 py-3 rounded-lg bg-card border border-accent/40 font-mono text-secondary text-sm md:text-base">
                  {UPI_ID}
                </code>
                <Button size="icon" variant="outline" onClick={() => copy(UPI_ID)} className="border-primary/40">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="rounded-lg bg-card/70 p-4 border border-accent/30 text-sm text-muted-foreground">
                Pay <span className="font-bold text-secondary">₹{finalAmount}</span> via {t(`donate.methods.${method}`)} using UPI ID above or scan the QR.
              </div>
            </div>
          </div>
        )}

        {method === "stripe" && (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Card payments via Stripe will be enabled in a future phase.
            </p>
            <Button disabled className="bg-gradient-saffron text-primary-foreground">
              Pay ₹{finalAmount} with Card
            </Button>
          </div>
        )}

        {method === "bank" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { l: t("donate.bankName"), v: "State Bank of India" },
              { l: t("donate.accountName"), v: "Indraprastha Brahman Samaj" },
              { l: t("donate.accountNumber"), v: "0000 1234 5678 9012" },
              { l: t("donate.ifsc"), v: "SBIN0001234" },
            ].map((row) => (
              <div key={row.l} className="rounded-lg bg-card p-4 border border-accent/30">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{row.l}</div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="font-mono text-secondary font-semibold">{row.v}</div>
                  <Button size="icon" variant="ghost" onClick={() => copy(row.v)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Impact */}
      <section>
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-secondary text-center mb-2">
          {t("donate.impact.title")}
        </h2>
        <div className="w-20 h-1 bg-gradient-gold mx-auto mb-8 rounded-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {impacts.map(({ icon: Icon, key }) => (
            <Card key={key} className="p-6 text-center transition-smooth hover:shadow-warm hover:-translate-y-1 border-accent/30">
              <div className="mx-auto w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center mb-3 shadow-gold">
                <Icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="font-serif text-sm font-semibold text-secondary">
                {t(`donate.impact.${key}`)}
              </p>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic">{t("donate.note")}</p>
        <p className="text-center font-sanskrit text-xl text-secondary mt-4">{t("donate.thankYou")}</p>
      </section>

      <DonorWall />
    </div>
  );
};

export default Donate;
