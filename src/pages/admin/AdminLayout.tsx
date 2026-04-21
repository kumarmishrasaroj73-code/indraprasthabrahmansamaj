import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, FileText, BookOpen, LogOut, Flame, Home, Users, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", end: true, icon: Home, label: "Overview" },
  { to: "/admin/announcements", icon: Bell, label: "Announcements" },
  { to: "/admin/notices", icon: FileText, label: "Notices" },
  { to: "/admin/members", icon: Users, label: "Directory" },
  { to: "/admin/matrimonial", icon: Heart, label: "Matrimonial" },
  { to: "/admin/intro", icon: BookOpen, label: "About Content" },
];

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/90 border-b border-accent/30 shadow-soft">
        <div className="container flex items-center justify-between h-16">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-saffron flex items-center justify-center shadow-warm">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-serif text-base font-bold text-secondary">Admin Panel</div>
              <div className="text-[10px] text-muted-foreground">{user?.email}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">View site</Link>
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-8 grid lg:grid-cols-[220px_1fr] gap-8">
        <aside>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map(({ to, end, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-smooth ${
                    isActive
                      ? "bg-gradient-saffron text-primary-foreground shadow-warm"
                      : "text-foreground/80 hover:bg-muted"
                  }`
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
