import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, ReactNode } from "react";
import { Loader2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user && !adminOnly) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, adminOnly, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Hide admin surface entirely from non-admins (and unauthenticated visitors)
  if (adminOnly && (!user || !isAdmin)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border mb-6">
          <Film className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Page not found</p>
        <Link to="/"><Button variant="outline">Go home</Button></Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
