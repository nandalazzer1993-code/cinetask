import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, Trophy, Film, TrendingUp, PlayCircle, ArrowUpFromLine } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  component: () => <RequireAuth><Dashboard /></RequireAuth>,
});

const RATES = { 0: 0, 1: 0.012, 2: 0.015, 3: 0.020 } as const;

function Dashboard() {
  const { profile, user } = useAuth();
  const { t } = useLang();
  const [completed, setCompleted] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("task_day", today)
      .then(({ count }) => setCompleted(count ?? 0));
    supabase
      .from("withdrawals")
      .select("id, amount, net_amount, status, created_at, reviewed_at, network, wallet_address")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setWithdrawals(data ?? []));
  }, [user]);

  if (!profile) return null;
  const rate = RATES[profile.vip_level as 0 | 1 | 2 | 3] ?? 0;
  const perTask = Number(profile.deposit_amount) * rate;
  const dailyEstimate = perTask * 25;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("welcomeBack")}{profile.username ? `, ${profile.username}` : ""}</h1>
          <p className="text-muted-foreground mt-1">{t("earningsOverview")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Wallet} label={t("balance")} value={`$${Number(profile.balance).toFixed(2)}`} accent="text-success" />
          <StatCard icon={TrendingUp} label={t("totalEarned")} value={`$${Number(profile.total_earned).toFixed(2)}`} accent="text-accent" />
          <StatCard icon={Trophy} label={t("vipLevel")} value={profile.vip_level === 0 ? "—" : `VIP ${profile.vip_level}`} accent="text-gradient-gold" />
          <StatCard icon={Film} label={t("todaysTasks")} value={`${completed} / 25`} accent="text-primary" />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
            <h2 className="font-semibold flex items-center gap-2"><Film className="h-5 w-5 text-primary" />{t("dailyProgress")}</h2>
            <div className="mt-4 flex justify-between text-sm"><span className="text-muted-foreground">{t("tasksCompleted")}</span><span className="font-semibold">{completed} / 25</span></div>
            <Progress value={(completed / 25) * 100} className="mt-2" />
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-muted-foreground">{t("perTask")}</div><div className="font-semibold text-success mt-1">${perTask.toFixed(2)}</div></div>
              <div><div className="text-muted-foreground">{t("dailyEstimate")}</div><div className="font-semibold text-success mt-1">${dailyEstimate.toFixed(2)}</div></div>
            </div>
            <Link to="/tasks"><Button className="mt-6 w-full bg-gradient-primary shadow-glow"><PlayCircle className="h-4 w-4 mr-2" />{t("startATask")}</Button></Link>
          </div>

          <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
            <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" />{t("vipStatus")}</h2>
            {profile.vip_level === 0 ? (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{t("notVipMsg")}</p>
                <Link to="/wallet"><Button className="mt-4" variant="outline">{t("goWallet")}</Button></Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("activeDeposit")}</span><span className="font-semibold">${Number(profile.deposit_amount).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("commissionRate")}</span><span className="font-semibold text-accent">{(rate * 100).toFixed(1)}% {t("perTaskShort")}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("tasksPerDay")}</span><span className="font-semibold">25</span></div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5 text-primary" />
              {t("withdrawalStatus")}
            </h2>
            <Link to="/wallet">
              <Button variant="outline" size="sm">{t("viewAll")}</Button>
            </Link>
          </div>

          {/* Status legend */}
          <div className="mb-4 rounded-lg border border-border/60 bg-background/40 p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t("legend")}</div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="bg-warning/20 text-warning border-warning/40 uppercase shrink-0">{t("pending")}</Badge>
                <span className="text-muted-foreground">{t("pendingDesc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="bg-success text-success-foreground border-transparent uppercase shrink-0">{t("approved")}</Badge>
                <span className="text-muted-foreground">{t("approvedDesc")}</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="bg-destructive text-destructive-foreground border-transparent uppercase shrink-0">{t("rejected")}</Badge>
                <span className="text-muted-foreground">{t("rejectedDesc")}</span>
              </div>
            </div>
          </div>

          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noWithdrawals")}</p>
          ) : (
            <div className="space-y-2">
              {withdrawals.map(w => {
                const cls =
                  w.status === "approved" ? "bg-success text-success-foreground border-transparent"
                  : w.status === "rejected" ? "bg-destructive text-destructive-foreground border-transparent"
                  : "bg-warning/20 text-warning border-warning/40";
                const statusLabel = w.status === "approved" ? t("approved") : w.status === "rejected" ? t("rejected") : t("pending");
                return (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        ${Number(w.amount).toFixed(2)}
                        <span className="text-muted-foreground ml-2 text-xs">{t("net")} ${Number(w.net_amount).toFixed(2)} • {w.network}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t("requested")} {new Date(w.created_at).toLocaleString()}
                        {w.reviewed_at && ` • ${t("reviewed")} ${new Date(w.reviewed_at).toLocaleString()}`}
                      </div>
                    </div>
                    <Badge variant="outline" className={`uppercase text-xs shrink-0 ml-2 ${cls}`}>{statusLabel}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card-elegant">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
