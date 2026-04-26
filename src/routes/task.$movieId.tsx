import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Timer, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/task/$movieId")({
  component: () => <RequireAuth><TaskPage /></RequireAuth>,
});

function TaskPage() {
  const { movieId } = Route.useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [movie, setMovie] = useState<any>(null);
  const [seconds, setSeconds] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [lucky, setLucky] = useState<{ required_recharge: number; reward_amount: number; commission_pct: number | null; task_index: number } | null>(null);

  useEffect(() => {
    supabase.from("movies").select("*").eq("id", movieId).maybeSingle().then(({ data }) => setMovie(data));
  }, [movieId]);

  useEffect(() => {
    if (done || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, done]);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("complete_task", { _movie_id: movieId });
      if (error) throw error;
      const result = data as any;
      if (result?.lucky_order) {
        setLucky({
          required_recharge: Number(result.required_recharge),
          reward_amount: Number(result.reward_amount),
          commission_pct: result.commission_pct != null ? Number(result.commission_pct) : null,
          task_index: Number(result.task_index),
        });
      } else {
        const r = result?.reward ?? 0;
        setReward(Number(r));
        setDone(true);
        toast.success(`Task complete! +$${Number(r).toFixed(2)}`);
        await refresh();
        setTimeout(() => navigate({ to: "/tasks" }), 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to complete task");
    } finally {
      setSubmitting(false);
    }
  };

  if (!movie) return <div className="min-h-screen"><Navbar /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;

  const src = movie.trailer_url.includes("?")
    ? `${movie.trailer_url}&autoplay=1&mute=1&playsinline=1`
    : `${movie.trailer_url}?autoplay=1&mute=1&playsinline=1`;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/tasks" })} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to tasks
        </Button>

        <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden shadow-elegant">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={src}
              title={movie.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          <div className="p-6">
            <h1 className="text-2xl font-bold">{movie.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{movie.description}</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3 border border-border">
                <Timer className="h-5 w-5 text-primary" />
                {done ? (
                  <span className="font-semibold text-success">Reward credited: +${reward?.toFixed(2)}</span>
                ) : seconds > 0 ? (
                  <span className="font-mono text-lg">Wait <span className="text-primary font-bold">{seconds}s</span></span>
                ) : (
                  <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Ready to complete</span>
                )}
              </div>

              <Button
                size="lg"
                onClick={handleComplete}
                disabled={seconds > 0 || submitting || done}
                className="ml-auto bg-gradient-primary shadow-glow"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? "Completed" : "Complete Task"}
              </Button>
            </div>

            {done && (
              <Button variant="outline" className="mt-4 w-full" onClick={() => navigate({ to: "/tasks" })}>
                Back to all tasks
              </Button>
            )}
          </div>
        </div>

        <Dialog open={!!lucky} onOpenChange={(o) => { if (!o) navigate({ to: "/tasks" }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-6 w-6 text-warning" />Lucky Order Triggered!
              </DialogTitle>
            </DialogHeader>
            {lucky && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  You've reached task <span className="text-foreground font-semibold">#{lucky.task_index}</span> — a special bonus task. To unlock the bonus and continue, please top up at least the required amount below.
                </p>
                <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Required Top-up</span>
                    <span className="font-bold text-lg">${lucky.required_recharge.toFixed(2)}</span>
                  </div>
                  {lucky.commission_pct != null && (
                    <div className="flex justify-between border-t border-border pt-3">
                      <span className="text-sm text-muted-foreground">Commission Rate</span>
                      <span className="font-bold text-lg text-primary">{lucky.commission_pct}%</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-warning">⚠ You cannot continue any tasks until you top up <strong>${lucky.required_recharge.toFixed(2)}</strong> or more.</p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => navigate({ to: "/wallet" })} className="bg-gradient-primary shadow-glow w-full">
                Recharge Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
