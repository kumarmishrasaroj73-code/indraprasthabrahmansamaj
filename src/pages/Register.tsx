import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Send, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  gotra: z.string().trim().max(80).optional().or(z.literal("")),
  family_head: z.string().trim().max(120).optional().or(z.literal("")),
  profession: z.string().trim().max(120).optional().or(z.literal("")),
  education: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  locality: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

const empty = {
  full_name: "", gotra: "", family_head: "", profession: "", education: "",
  city: "", locality: "", phone: "", email: "", message: "",
};

const Register = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: t("register.invalid"), description: Object.values(parsed.error.flatten().fieldErrors).flat().join(", "), variant: "destructive" });
      return;
    }
    setBusy(true);
    const payload: any = {};
    Object.entries(parsed.data).forEach(([k, v]) => { payload[k] = v ? v : null; });
    payload.full_name = parsed.data.full_name;
    const { error } = await supabase.from("member_registrations").insert(payload);
    setBusy(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    // Email admins (best-effort, ignore failures)
    supabase.functions
      .invoke("notify-admins-email", {
        body: {
          subject: `New member registration: ${payload.full_name}`,
          html: `
            <h2 style="font-family:Georgia,serif;color:#7c2d12">New member registration</h2>
            <p><b>Name:</b> ${payload.full_name}</p>
            ${payload.gotra ? `<p><b>Gotra:</b> ${payload.gotra}</p>` : ""}
            ${payload.city ? `<p><b>City:</b> ${payload.city}</p>` : ""}
            ${payload.phone ? `<p><b>Phone:</b> ${payload.phone}</p>` : ""}
            ${payload.email ? `<p><b>Email:</b> ${payload.email}</p>` : ""}
            ${payload.message ? `<p><b>Message:</b><br/>${String(payload.message).replace(/\n/g,"<br/>")}</p>` : ""}
            <p style="margin-top:16px"><a href="https://indraprasthbrahmansamaj.org/admin/registrations">Review in admin panel →</a></p>
          `,
        },
      })
      .catch(() => {});
    setDone(true);
  };

  if (done) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
        <h1 className="font-serif text-3xl font-bold text-secondary mb-3">{t("register.thanks")}</h1>
        <p className="text-muted-foreground">{t("register.thanksBody")}</p>
      </div>
    );
  }

  const f = (key: keyof typeof empty, label: string, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="container py-12 md:py-16 max-w-2xl">
      <header className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-primary/10 text-primary text-xs uppercase tracking-widest mb-4">
          <UserPlus className="h-3 w-3" /> {t("register.title")}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-secondary mb-3">{t("register.title")}</h1>
        <div className="w-24 h-1 bg-gradient-gold mx-auto rounded-full mb-4" />
        <p className="text-muted-foreground">{t("register.subtitle")}</p>
      </header>

      <Card className="p-6 md:p-8 border-accent/30">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{f("full_name", `${t("register.fullName")} *`)}</div>
          {f("gotra", t("register.gotra"))}
          {f("family_head", t("register.familyHead"))}
          {f("profession", t("register.profession"))}
          {f("education", t("register.education"))}
          {f("city", t("register.city"))}
          {f("locality", t("register.locality"))}
          {f("phone", t("register.phone"), "tel")}
          {f("email", t("register.email"), "email")}
          <div className="sm:col-span-2">
            <Label>{t("register.message")}</Label>
            <Textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={submit} disabled={busy} className="w-full mt-6 bg-gradient-saffron text-primary-foreground shadow-warm">
          <Send className="h-4 w-4 mr-2" /> {busy ? "…" : t("register.submit")}
        </Button>
      </Card>
    </div>
  );
};

export default Register;
