import { useEffect, useState } from "react";
import { Sparkles, Loader2, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function LuckyOrdersTab() {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data }, { data: profs }] = await Promise.all([
      supabase.from("lucky_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,username,email,phone").order("username"),
    ]);
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems((data ?? []).map((d: any) => ({ ...d, profile: pmap.get(d.user_id) })));
    setUsers(profs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("lucky_orders").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); load(); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Inject special tasks that require cumulative deposits to resolve.</p>
        <CreateLuckyOrder users={users} onCreated={load} />
      </div>
      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto shadow-card-elegant">
        <table className="w-full text-sm">
          <thead className="bg-card/50 border-b border-border">
            <tr className="text-left">
              <th className="p-3">User</th>
              <th className="p-3">Task #</th>
              <th className="p-3">Required Top-up</th>
              <th className="p-3">Commission</th>
              <th className="p-3">Cumulative</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No lucky orders yet.</td></tr>
            ) : items.map(it => {
              const cum = Number(it.cumulative_deposit ?? 0);
              const req = Number(it.required_recharge);
              const pct = Math.min(100, (cum / req) * 100);
              return (
              <tr key={it.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="p-3">
                  <div className="font-medium">{it.profile?.username || "—"}</div>
                  <div className="text-xs text-muted-foreground">{it.profile?.email || it.profile?.phone}</div>
                </td>
                <td className="p-3 font-mono">#{it.task_index}</td>
                <td className="p-3 font-semibold">${req.toFixed(2)}</td>
                <td className="p-3 font-semibold text-primary">{it.commission_pct != null ? `${Number(it.commission_pct)}%` : "—"}</td>
                <td className="p-3">
                  <div className="font-semibold">${cum.toFixed(2)}</div>
                  <div className="h-1.5 w-24 bg-card rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </td>
                <td className="p-3"><StatusBadge status={it.status} /></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</td>
                <td className="p-3">
                  {it.status === "pending" && (
                    <Button size="sm" variant="destructive" onClick={() => cancel(it.id)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "claimed" ? "bg-success text-success-foreground"
    : status === "cancelled" ? "bg-destructive text-destructive-foreground"
    : status === "recharged" ? "bg-accent text-accent-foreground" : "";
  return <Badge variant={status === "pending" ? "outline" : "default"} className={cls}>{status}</Badge>;
}

function CreateLuckyOrder({ users, onCreated }: { users: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [taskIdx, setTaskIdx] = useState("15");
  const [recharge, setRecharge] = useState("100");
  const [commissionPct, setCommissionPct] = useState("10");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!userId) { toast.error("Pick a user"); return; }
    if (Number(recharge) <= 0) { toast.error("Required top-up must be greater than 0"); return; }
    const pct = Number(commissionPct);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Commission must be between 0 and 100"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("lucky_orders").insert({
        user_id: userId,
        task_index: Number(taskIdx),
        required_recharge: Number(recharge),
        commission_pct: pct,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Lucky order created");
      setOpen(false); onCreated();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" /><Sparkles className="h-4 w-4 mr-1" />New Lucky Order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Lucky Order</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.username || u.email || u.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Task # (1-25)</Label><Input type="number" min={1} max={25} value={taskIdx} onChange={e => setTaskIdx(e.target.value)} /></div>
            <div><Label>Required Top-up ($)</Label><Input type="number" min={1} step="0.01" value={recharge} onChange={e => setRecharge(e.target.value)} /></div>
            <div><Label>Commission %</Label><Input type="number" min={0} max={100} step="0.01" value={commissionPct} onChange={e => setCommissionPct(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">When the user reaches task #{taskIdx}, tasks are blocked until <strong>cumulative approved deposits</strong> reach <strong>${recharge}</strong>. Bonus is auto-credited at <strong>{commissionPct}%</strong> of the required top-up once resolved.</p>
        </div>
        <DialogFooter><Button onClick={create} disabled={busy} className="bg-gradient-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
