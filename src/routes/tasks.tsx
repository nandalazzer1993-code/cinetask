import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Film, PlayCircle, CheckCircle2, Loader2, Lock, Sparkles, Shuffle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  component: () => <RequireAuth><TasksPage /></RequireAuth>,
});

interface Movie {
  id: string;
  title: string;
  poster_url: string | null;
  trailer_url: string;
  description: string | null;
  category: "latest" | "upcoming" | "trending";
}

const TABS: { key: "latest" | "upcoming" | "trending"; label: string }[] = [
  { key: "latest", label: "Latest Releases" },
  { key: "trending", label: "Trending" },
  { key: "upcoming", label: "Upcoming" },
];

function TasksPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]); // movie_ids done today
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingLucky, setPendingLucky] = useState<{ required_recharge: number; task_index: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from("movies").select("*").eq("active", true).order("created_at", { ascending: false }),
      supabase.from("task_completions").select("movie_id").eq("user_id", user.id).eq("task_day", today),
      supabase.from("lucky_orders").select("required_recharge,task_index,triggered_at").eq("user_id", user.id).eq("status", "pending").not("triggered_at", "is", null).order("triggered_at", { ascending: true }).limit(1),
    ]).then(([m, c, l]) => {
      setMovies((m.data as Movie[]) ?? []);
      const ids = (c.data ?? []).map((r: any) => r.movie_id).filter(Boolean);
      setCompletedToday(ids);
      setCompletedCount((c.data ?? []).length);
      const lucky = (l.data ?? [])[0];
      if (lucky) setPendingLucky({ required_recharge: Number(lucky.required_recharge), task_index: Number(lucky.task_index) });
      setLoading(false);
    });
  }, [user]);

  const grouped = useMemo(() => ({
    latest: movies.filter(m => m.category === "latest"),
    upcoming: movies.filter(m => m.category === "upcoming"),
    trending: movies.filter(m => m.category === "trending"),
  }), [movies]);

  if (loading || !profile) return <div className="min-h-screen"><Navbar /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;

  const canDoTasks = profile.vip_level >= 1 && Number(profile.deposit_amount) > 0;
  const remaining = 25 - completedCount;
  const completedSet = new Set(completedToday);

  const startTask = (movie: Movie) => {
    if (!canDoTasks) { toast.error("VIP level and deposit required"); return; }
    if (pendingLucky) { toast.error("Recharge required to unlock your Lucky Order before continuing"); return; }
    if (completedSet.has(movie.id)) { toast.error("This movie task is already completed today"); return; }
    if (remaining <= 0) { toast.error("Daily limit reached"); return; }
    navigate({ to: "/task/$movieId", params: { movieId: movie.id } });
  };

  const getRandomTask = () => {
    if (!canDoTasks) { toast.error("VIP level and deposit required"); return; }
    if (pendingLucky) { toast.error("Recharge required to unlock your Lucky Order before continuing"); return; }
    if (remaining <= 0) { toast.error("Daily limit reached"); return; }
    const pool = movies.filter(m => !completedSet.has(m.id));
    if (!pool.length) { toast.error("No available movies — all done!"); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate({ to: "/task/$movieId", params: { movieId: pick.id } });
  };

  const renderGrid = (list: Movie[]) => (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {list.length === 0 ? (
        <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No movies in this category yet.
        </div>
      ) : list.map((m) => {
        const isDone = completedSet.has(m.id);
        const isLocked = !canDoTasks || !!pendingLucky || remaining <= 0 || isDone;
        return (
          <div key={m.id} className={`group relative overflow-hidden rounded-xl border border-border bg-card shadow-card-elegant transition ${isLocked ? "opacity-80" : "hover:shadow-glow hover:-translate-y-1"}`}>
            <div className="relative aspect-[2/3] bg-muted overflow-hidden">
              {m.poster_url ? <img src={m.poster_url} alt={m.title} className={`h-full w-full object-cover transition ${!isLocked && "group-hover:scale-105"} ${isDone && "grayscale"}`} /> : <div className="flex h-full items-center justify-center"><Film className="h-12 w-12 text-muted-foreground" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
              {isDone && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <div className="rounded-full bg-success/95 px-3 py-1.5 text-xs flex items-center gap-1 text-success-foreground font-semibold shadow-lg">
                    <CheckCircle2 className="h-4 w-4" />Done
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold truncate">{m.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{m.description}</p>
              <Button size="sm" onClick={() => startTask(m)} disabled={isLocked} className="mt-3 w-full bg-gradient-primary">
                {isDone ? <><CheckCircle2 className="h-4 w-4 mr-1" />Completed</> : isLocked ? <><Lock className="h-3 w-3 mr-1" />Locked</> : <><PlayCircle className="h-4 w-4 mr-1" />Start Task</>}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Film className="h-7 w-7 text-primary" />Movie Tasks</h1>
            <p className="text-muted-foreground mt-1">Watch a 10-second trailer preview to complete each task</p>
          </div>
          <div className="rounded-xl border border-border bg-gradient-card px-5 py-3 min-w-[220px]">
            <div className="flex justify-between text-sm mb-2"><span className="text-muted-foreground">Today</span><span className="font-semibold">{completedCount} / 25</span></div>
            <Progress value={(completedCount / 25) * 100} />
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-primary/40 bg-primary/10 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2"><Shuffle className="h-5 w-5 text-primary" />Quick Task</h2>
            <p className="text-xs text-muted-foreground mt-1">Tap below for a random movie trailer (10-second timer).</p>
          </div>
          <Button size="lg" onClick={getRandomTask} disabled={!canDoTasks || !!pendingLucky || remaining <= 0} className="bg-gradient-primary shadow-glow">
            <Shuffle className="h-4 w-4 mr-2" />Get Task
          </Button>
        </div>

        {!canDoTasks && (
          <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <strong className="text-warning">Activation required:</strong>{" "}
            {profile.vip_level === 0 ? "You need a VIP level assigned by admin after your deposit is approved." : "You need an active deposit to start tasks."}
          </div>
        )}

        {pendingLucky && (
          <div className="mb-6 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="text-warning">Lucky Order pending at task #{pendingLucky.task_index}.</strong>{" "}
              You must top up at least <strong>${pendingLucky.required_recharge.toFixed(2)}</strong> before you can continue any tasks. After admin approval, your bonus reward is credited automatically.
            </div>
            <Button size="sm" onClick={() => navigate({ to: "/wallet" })} className="bg-gradient-primary shrink-0">Recharge</Button>
          </div>
        )}

        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            {TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          {TABS.map(t => (
            <TabsContent key={t.key} value={t.key}>
              {renderGrid(grouped[t.key])}
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
