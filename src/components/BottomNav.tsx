import { NavLink } from "react-router-dom";
import { Home, Users, MessageCircle, Calendar, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

export const BottomNav = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const items = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/community", icon: Users, label: t("nav.community", "Community") },
    { to: "/events", icon: Calendar, label: t("nav.events") },
    { to: "/chat", icon: MessageCircle, label: t("nav.chat") },
    { to: user ? "/profile" : "/auth", icon: User, label: t("nav.profile", "Profile") },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-accent/30 shadow-soft"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-smooth ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[64px]">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
