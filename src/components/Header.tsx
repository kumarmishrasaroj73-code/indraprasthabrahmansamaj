import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, Flame } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/about", label: t("nav.about") },
    { to: "/announcements", label: t("nav.announcements") },
    { to: "/notices", label: t("nav.notices") },
    { to: "/donate", label: t("nav.donate") },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-background/85 border-b border-accent/30 shadow-soft">
      <div className="container flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="relative h-10 w-10 rounded-full bg-gradient-saffron flex items-center justify-center shadow-warm">
            <Flame className="h-5 w-5 text-primary-foreground animate-flicker" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-base md:text-lg font-bold text-secondary">
              {t("brand.name")}
            </div>
            <div className="text-[10px] md:text-xs text-muted-foreground tracking-wide">
              {t("brand.tagline")}
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:text-primary hover:bg-muted"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-accent/30 bg-background">
          <div className="container py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                  location.pathname === l.to
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
