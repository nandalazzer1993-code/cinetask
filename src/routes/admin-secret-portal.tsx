import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Loader2, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-secret-portal")({
  component: AdminPortal,
});

function AdminPortal() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin123");
  const [showNotFound, setShowNotFound] = useState(false);

  // Ensure the default admin account exists (idempotent).
  useEffect(() => {
    (async () => {
      try {
        const { ensureDefaultAdmin } = await import("@/server/admin.functions");
        await ensureDefaultAdmin();
      } catch {
        // silent — login will surface real errors
      }
    })();
  }, []);

  // If a non-admin user is logged in, show 404 to hide existence of this route.
  useEffect(() => {
    if (!loading && user && !isAdmin) {
      setShowNotFound(true);
    }
    if (!loading && user && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [user, loading, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showNotFound) {
    return <NotFound404 />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // Verify role server-side via RLS-aware query
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user!.id);
      const ok = (roles ?? []).some((r: any) => r.role === "admin");
      if (!ok) {
        await supabase.auth.signOut();
        // Pretend route doesn't exist
        setShowNotFound(true);
        return;
      }
      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center items-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Admin <span className="text-gradient-primary">Portal</span></span>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-card p-6 md:p-8 shadow-elegant">
          <p className="text-xs text-muted-foreground mb-4 text-center">
            Restricted area. Authorized personnel only.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mb-4 text-center">
            Default credentials: <code className="font-mono">admin@test.com</code> / <code className="font-mono">admin123</code>
          </p>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <Label>Admin Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}

function NotFound404() {
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
