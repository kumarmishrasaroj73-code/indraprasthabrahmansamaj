import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="mt-20 border-t border-accent/30 bg-gradient-warm">
      <div className="container py-10 grid gap-8 md:grid-cols-3 text-center md:text-left">
        <div>
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <Flame className="h-5 w-5 text-primary animate-flicker" />
            <span className="font-serif text-lg font-bold text-secondary">
              {t("brand.name")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
        </div>
        <div className="font-sanskrit text-2xl text-secondary self-center">
          {t("footer.blessing")}
        </div>
        <div className="text-sm text-muted-foreground self-center md:text-right">
          © {new Date().getFullYear()} {t("brand.name")}. <br />
          {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};
