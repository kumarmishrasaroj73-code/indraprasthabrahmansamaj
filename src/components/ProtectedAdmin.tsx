import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Flame } from "lucide-react";

export const ProtectedAdmin = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm">
        <Flame className="h-8 w-8 text-primary animate-flicker" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl font-bold text-secondary mb-3">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You are signed in but do not have admin privileges. Please contact a Samaj
            administrator.
          </p>
          <a href="/" className="text-primary hover:underline">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
