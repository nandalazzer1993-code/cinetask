import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", password: "", username: "", referralCode: "" });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = form.referralCode.trim().toUpperCase();
    if (!ref || ref.length !== 8) { toast.error("Referral code is required (8 characters)"); return; }
    setBusy(true);
    try {
      const credentials: any = method === "email"
        ? { email: form.email.trim(), password: form.password }
        : { phone: form.phone.trim(), password: form.password };
      const { error } = await supabase.auth.signUp({
        ...credentials,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
          data: { username: form.username.trim() || undefined, referral_code: ref },
        },
      });
      if (error) throw error;
      // Email confirmation disabled — auto sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword(credentials);
      if (signInErr) {
        toast.success("Account created — please sign in");
        setTab("signin");
      } else {
        toast.success("Welcome!");
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const credentials: any = method === "email"
        ? { email: form.email.trim(), password: form.password }
        : { phone: form.phone.trim(), password: form.password };
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">CINE<span className="text-gradient-primary">TASK</span></span>
        </Link>

        <div className="rounded-2xl border border-border bg-gradient-card p-6 md:p-8 shadow-elegant">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <div className="mb-4 flex gap-2">
              <Button type="button" size="sm" variant={method === "email" ? "default" : "outline"} className="flex-1" onClick={() => setMethod("email")}>Email</Button>
              <Button type="button" size="sm" variant={method === "phone" ? "default" : "outline"} className="flex-1" onClick={() => setMethod("phone")}>Phone</Button>
            </div>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                {method === "email" ? (
                  <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                ) : (
                  <div><Label>Phone (with country code)</Label><Input type="tel" required placeholder="+1234567890" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                )}
                <div><Label>Password</Label><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div><Label>Username (optional)</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
                {method === "email" ? (
                  <div><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                ) : (
                  <div><Label>Phone (with country code)</Label><Input type="tel" required placeholder="+1234567890" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                )}
                <div><Label>Password (min 6 chars)</Label><Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div>
                  <Label>Referral Code <span className="text-destructive">*</span></Label>
                  <Input
                    required
                    maxLength={8}
                    placeholder="8-character code from inviter"
                    value={form.referralCode}
                    onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">A referral code is required. Ask your inviter for theirs.</p>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary shadow-glow" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
