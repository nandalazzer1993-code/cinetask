import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film, Trophy, Shield, PlayCircle, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Landing,
});

const PROJECT_START = new Date("2025-06-01");

function Landing() {
  const [stats, setStats] = useState({ members: 15000, paid: 2_500_000, days: 320 });

  useEffect(() => {
    (async () => {
      const [{ count }, { data: wd }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("withdrawals").select("net_amount").eq("status", "approved"),
      ]);
      const realPaid = (wd ?? []).reduce((s, w: any) => s + Number(w.net_amount || 0), 0);
      const days = Math.max(320, Math.floor((Date.now() - PROJECT_START.getTime()) / 86400000));
      setStats({
        members: 15000 + (count ?? 0),
        paid: 2_500_000 + realPaid,
        days,
      });
    })();
  }, []);

  const fmtMoney = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M+` : `$${(n / 1000).toFixed(0)}K+`;
  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : `${n}+`;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-16 md:pt-24 md:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Earn daily by watching trailers
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight">
            Watch. Earn.<br />
            <span className="text-gradient-primary">CineTask.</span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete 25 daily movie trailer tasks. Upgrade your VIP level to boost commissions
            and turn movie time into real earnings.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="bg-gradient-primary text-base md:text-lg px-8 md:px-10 py-6 md:py-7 rounded-2xl animate-pulse-cta">
                <PlayCircle className="h-6 w-6 mr-2" /> Start Earning
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="rounded-2xl">Sign In</Button>
            </Link>
          </div>
        </div>

        {/* Live stats */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Users, label: "Total Members", value: fmtNum(stats.members) },
            { icon: DollarSign, label: "Total Paid Out", value: fmtMoney(stats.paid) },
            { icon: Calendar, label: "Days Online", value: `${stats.days}+` },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl p-5 text-center">
              <s.icon className="h-6 w-6 mx-auto text-accent mb-2" />
              <div className="text-2xl md:text-3xl font-bold text-gradient-gold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* VIP Tiers — glassmorphism */}
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { lvl: 1, rate: "1.2%", daily: "$30", deposit: "$100" },
            { lvl: 2, rate: "1.5%", daily: "$375", deposit: "$1,000", featured: true },
            { lvl: 3, rate: "2.0%", daily: "$5,000", deposit: "$10,000" },
          ].map((t) => (
            <div key={t.lvl} className={`relative glass-card rounded-2xl p-6 ${t.featured ? "ring-2 ring-accent/60 shadow-glow" : ""}`}>
              {t.featured && <div className="absolute -top-3 left-6 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-accent-foreground">Most Popular</div>}
              <div className="flex items-center gap-2 text-accent">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">VIP {t.lvl}</span>
              </div>
              <div className="mt-4 text-4xl font-bold text-gradient-gold">{t.rate}</div>
              <div className="text-sm text-muted-foreground">per task · 25 tasks/day</div>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/60 pb-2"><span className="text-muted-foreground">Min deposit</span><span className="font-medium">{t.deposit}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Daily earnings</span><span className="font-semibold text-success">{t.daily}</span></div>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            { icon: Film, title: "25 Trailer Tasks Daily", desc: "Watch curated movie trailers. Each task takes only 10 seconds." },
            { icon: TrendingUp, title: "Dynamic Commissions", desc: "Earnings scale with your deposit and VIP level — automatically." },
            { icon: Shield, title: "Locked Wallet Security", desc: "Bind your wallet once. Only admin can change it later." },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Movie Partners */}
        <div className="mt-20 text-center">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-6">Our Movie Partners</h3>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-60 grayscale hover:opacity-90 transition-opacity">
            {["NETFLIX", "DISNEY+", "HBO", "PRIME VIDEO"].map((p) => (
              <span key={p} className="text-xl md:text-2xl font-extrabold tracking-wider text-muted-foreground">{p}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
