import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User as UserIcon, Mail, Phone, Trophy, Camera, Loader2, Lock, Languages, Copy, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { useLang, LANGUAGES } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: () => <RequireAuth><Account /></RequireAuth>,
});

function Account() {
  const { profile, user, isAdmin } = useAuth();
  const { lang, setLang, t } = useLang();
  const [copied, setCopied] = useState(false);

  if (!profile) return null;

  const copy = () => {
    if (!profile.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast.success(t("copied"));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2"><UserIcon className="h-7 w-7 text-primary" />{t("myProfile")}</h1>

        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant mb-6">
          <AvatarSection />
        </div>

        {/* Referral code */}
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant mb-6">
          <Label className="text-xs text-muted-foreground">{t("yourReferralCode")}</Label>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-background px-4 py-3 font-mono text-lg tracking-widest text-center text-accent">{profile.referral_code || "—"}</code>
            <Button variant="outline" size="icon" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Share this code so others can register under you.</p>
        </div>

        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="info">{t("info")}</TabsTrigger>
            <TabsTrigger value="password"><Lock className="h-4 w-4 mr-1" />{t("password")}</TabsTrigger>
            <TabsTrigger value="lang"><Languages className="h-4 w-4 mr-1" />{t("language")}</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant space-y-4">
              <UsernameEditor />
              <Row label={t("email")} value={user?.email || "—"} icon={Mail} />
              <Row label={t("phone")} value={user?.phone || profile.phone || "—"} icon={Phone} />
              <Row label={t("vipLevel")} value={profile.vip_level === 0 ? t("notVip") : `VIP ${profile.vip_level}`} icon={Trophy} />
              <Row label={t("accountId")} value={user?.id || ""} mono />
              {isAdmin && <Row label={t("role")} value={<Badge className="bg-accent text-accent-foreground">ADMIN</Badge>} />}
            </div>
          </TabsContent>

          <TabsContent value="password">
            <PasswordSection />
          </TabsContent>

          <TabsContent value="lang">
            <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
              <Label className="mb-3 block">{t("language")}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {LANGUAGES.map(l => (
                  <Button
                    key={l.code}
                    variant={lang === l.code ? "default" : "outline"}
                    onClick={() => setLang(l.code)}
                    className={lang === l.code ? "bg-gradient-primary" : ""}
                  >
                    {l.native}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AvatarSection() {
  const { profile, user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "0" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updErr) throw updErr;
      toast.success("Photo updated");
      await refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl">
            {(profile?.username || user?.email || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {busy && <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
      </div>
      <div className="flex-1">
        <div className="text-lg font-semibold">{profile?.username || "User"}</div>
        <label className="inline-flex">
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy} />
          <Button variant="outline" size="sm" asChild><span className="cursor-pointer"><Camera className="h-4 w-4 mr-1" />Change Photo</span></Button>
        </label>
      </div>
    </div>
  );
}

function UsernameEditor() {
  const { profile, user, refresh } = useAuth();
  const [name, setName] = useState(profile?.username || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || name.length > 32) { toast.error("Name must be 1-32 chars"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ username: name.trim() }).eq("id", user!.id);
      if (error) throw error;
      toast.success("Name updated");
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground">Display Name</Label>
      <div className="mt-1 flex gap-2">
        <Input value={name} maxLength={32} onChange={e => setName(e.target.value)} />
        <Button onClick={save} disabled={busy || name === profile?.username} className="bg-gradient-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>
    </div>
  );
}


function PasswordSection() {
  const { t } = useLang();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (pwd.length < 6) { toast.error("Min 6 characters"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Password updated");
      setPwd(""); setConfirm("");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><Lock className="h-5 w-5 text-accent" />{t("changePassword")}</h3>
      <div><Label>{t("newPassword")}</Label><Input type="password" value={pwd} onChange={e => setPwd(e.target.value)} minLength={6} /></div>
      <div><Label>Confirm</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={6} /></div>
      <Button onClick={save} disabled={busy || !pwd} className="w-full bg-gradient-primary">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
      </Button>
    </div>
  );
}

function Row({ label, value, icon: Icon, mono }: any) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}{label}
      </div>
      <div className={`text-sm font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
