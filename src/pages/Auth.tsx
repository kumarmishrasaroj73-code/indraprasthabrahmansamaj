import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flame, Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Please enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/admin", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({
        title: "Invalid input",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      if (tab === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: t("auth.signedIn", "Welcome back") });
        navigate("/admin", { replace: true });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast({
          title: t("auth.signupSuccess", "Account created"),
          description: t("auth.signupCheckEmail", "Check your inbox to confirm your email."),
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-warm px-4 py-12">
      <Card className="w-full max-w-md p-8 ornate-border">
        <Link to="/" className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-full bg-gradient-saffron flex items-center justify-center shadow-warm mb-3">
            <Flame className="h-7 w-7 text-primary-foreground animate-flicker" />
          </div>
          <div className="font-sanskrit text-xl text-accent">॥ ॐ ॥</div>
          <h1 className="font-serif text-2xl font-bold text-secondary mt-2 text-center">
            {t("brand.name")}
          </h1>
        </Link>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="signin">
              <LogIn className="mr-2 h-4 w-4" /> {t("auth.signIn", "Sign In")}
            </TabsTrigger>
            <TabsTrigger value="signup">
              <UserPlus className="mr-2 h-4 w-4" /> {t("auth.signUp", "Sign Up")}
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email", "Email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password", "Password")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-saffron text-primary-foreground hover:opacity-90"
            >
              {busy
                ? t("auth.pleaseWait", "Please wait…")
                : tab === "signin"
                ? t("auth.signIn", "Sign In")
                : t("auth.createAccount", "Create Account")}
            </Button>
          </form>

          <TabsContent value="signup">
            <p className="text-xs text-muted-foreground text-center mt-4">
              {t(
                "auth.adminNote",
                "Tip: signing up with admin@indraprasthbrahmansamaj.org grants admin access automatically."
              )}
            </p>
          </TabsContent>
        </Tabs>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary">
            ← {t("auth.backHome", "Back to home")}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Auth;
