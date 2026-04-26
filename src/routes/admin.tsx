import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Users, ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet, Pencil, Trash2, Film, Inbox, Settings as SettingsIcon, Clock, Sparkles, Circle, Plus, UserX, RefreshCw } from "lucide-react";
import { countryFlag } from "@/hooks/use-realtime-notifications";
import { MoviesTab } from "./admin/-components/MoviesTab";
import { LuckyOrdersTab } from "./admin/-components/LuckyOrdersTab";
import { AdminWalletsTab } from "./admin/-components/AdminWalletsTab";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth adminOnly><AdminPanel /></RequireAuth>,
});

function AdminPanel() {
  const [tab, setTab] = useState("pending");
  const { profile, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 max-w-7xl h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Admin Portal</p>
              <p className="text-[11px] text-muted-foreground">Restricted area</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground">{profile?.email ?? "admin"}</span>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); }} asChild={false}>
              <Link to="/" onClick={async (e) => { e.preventDefault(); await signOut(); window.location.href = "/"; }}>
                <LogOut className="h-4 w-4 mr-1" /> Sign out
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Shield className="h-7 w-7 text-accent" />Admin Dashboard
        </h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="inline-flex h-auto flex-wrap gap-1 bg-card/60 border border-border rounded-xl p-1 mb-6">
            <TabsTrigger value="pending" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><Clock className="h-4 w-4 mr-2" />Pending</TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="deposits" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><ArrowDownToLine className="h-4 w-4 mr-2" />Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><ArrowUpFromLine className="h-4 w-4 mr-2" />Withdrawals</TabsTrigger>
            <TabsTrigger value="movies" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><Film className="h-4 w-4 mr-2" />Movies</TabsTrigger>
            <TabsTrigger value="addresses" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><Wallet className="h-4 w-4 mr-2" />Wallets</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-black"><SettingsIcon className="h-4 w-4 mr-2" />Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="pending"><PendingTransactionsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="movies"><MoviesTab /></TabsContent>
          <TabsContent value="deposits"><DepositsTab /></TabsContent>
          <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
          <TabsContent value="addresses"><AdminWalletsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PendingTransactionsTab() {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: dep }, { data: wd }] = await Promise.all([
      supabase.from("deposits").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    const ids = Array.from(new Set([...(dep ?? []), ...(wd ?? [])].map((x: any) => x.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,username,email,phone").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setDeposits((dep ?? []).map((d: any) => ({ ...d, profiles: pmap.get(d.user_id) })));
    setWithdrawals((wd ?? []).map((d: any) => ({ ...d, profiles: pmap.get(d.user_id) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const actDep = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc(approve ? "approve_deposit" : "reject_deposit", { _deposit_id: id });
    if (error) toast.error(error.message); else { toast.success(approve ? "Approved" : "Rejected"); load(); }
  };
  const actWd = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc(approve ? "approve_withdrawal" : "reject_withdrawal", { _w_id: id });
    if (error) toast.error(error.message); else { toast.success(approve ? "Approved" : "Rejected"); load(); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <PendingCard title="Pending Top-ups" icon={<ArrowDownToLine className="h-5 w-5 text-success" />} count={deposits.length} items={deposits} kind="deposit" onAction={actDep} />
      <PendingCard title="Pending Withdrawals" icon={<ArrowUpFromLine className="h-5 w-5 text-accent" />} count={withdrawals.length} items={withdrawals} kind="withdraw" onAction={actWd} />
    </div>
  );
}

function PendingCard({ title, icon, count, items, kind, onAction }: {
  title: string; icon: React.ReactNode; count: number; items: any[];
  kind: "deposit" | "withdraw"; onAction: (id: string, approve: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card shadow-card-elegant p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">{icon}<h2 className="text-lg font-semibold">{title}</h2></div>
        <Badge variant="outline" className="rounded-full px-3 py-1 text-sm font-mono">{count}</Badge>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No pending {kind === "deposit" ? "top-ups" : "withdrawals"}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="rounded-xl border border-border/60 bg-card/40 p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{it.profiles?.username || it.profiles?.email || "—"}</div>
                <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${Number(it.amount).toFixed(2)}</div>
                <div className="flex gap-1 mt-1">
                  <Button size="sm" className="h-7 px-2 bg-success text-success-foreground hover:bg-success/90" onClick={() => onAction(it.id, true)}>Approve</Button>
                  <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => onAction(it.id, false)}>Reject</Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="rounded-2xl border border-border bg-gradient-card shadow-card-elegant p-8 text-center">
      <SettingsIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
      <h2 className="text-lg font-semibold mb-1">Settings</h2>
      <p className="text-sm text-muted-foreground">Platform settings coming soon.</p>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profiles }, { data: wallets }, { data: counts }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("wallets").select("*"),
      supabase.from("task_completions").select("user_id").eq("task_day", today),
    ]);
    const wmap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
    const cmap = new Map<string, number>();
    (counts ?? []).forEach((c: any) => cmap.set(c.user_id, (cmap.get(c.user_id) ?? 0) + 1));
    setUsers((profiles ?? []).map((p: any) => ({ ...p, wallet: wmap.get(p.id), today_tasks: cmap.get(p.id) ?? 0 })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <Input
        type="search"
        name="admin-user-search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        data-1p-ignore="true"
        placeholder="Search by email, username, or phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto shadow-card-elegant">
        <table className="w-full text-sm">
          <thead className="bg-card/50 border-b border-border">
            <tr className="text-left">
              <th className="p-3">User</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Country</th>
              <th className="p-3">Last IP</th>
              <th className="p-3">Logins</th>
              <th className="p-3">Registered</th>
              <th className="p-3">Last Active</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Deposit</th>
              <th className="p-3">VIP</th>
              <th className="p-3">Today</th>
              <th className="p-3">Wallet</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const lastSeenMs = u.last_seen ? Date.now() - new Date(u.last_seen).getTime() : Infinity;
              const online = lastSeenMs < 5 * 60 * 1000;
              const isDemo = u.account_type === "demo";
              const inactive = u.is_active === false;
              const fmt = (d: string | null | undefined) => d ? new Date(d).toLocaleString("sv-SE").replace("T", " ").slice(0, 19) : "—";
              const loc = [u.last_city, u.last_region].filter(Boolean).join(", ");
              return (
              <tr key={u.id} className={`border-b border-border/40 hover:bg-card/40 ${inactive ? "opacity-50" : ""}`}>
                <td className="p-3">
                  <div className="font-medium flex items-center gap-2">{u.username || "—"}{inactive && <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">Deactivated</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{u.email || u.phone}</div>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className={isDemo ? "border-warning/50 text-warning" : "border-success/50 text-success"}>{isDemo ? "Demo" : "Real"}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <Circle className={`h-2.5 w-2.5 ${online ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground"}`} />
                    <span className={`text-xs ${online ? "text-success" : "text-muted-foreground"}`}>{online ? "Online" : "Offline"}</span>
                  </div>
                </td>
                <td className="p-3 text-sm">
                  {u.country_code
                    ? <span title={u.country}><span className="text-base mr-1">{countryFlag(u.country_code)}</span>{u.country_code}</span>
                    : <span className="text-muted-foreground text-xs">—</span>}
                  {loc && <div className="text-[10px] text-muted-foreground">{loc}</div>}
                </td>
                <td className="p-3 text-xs font-mono">{u.last_ip || "—"}</td>
                <td className="p-3 text-xs font-mono">{u.login_count ?? 0}</td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(u.created_at)}</td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{fmt(u.last_seen)}</td>
                <td className="p-3 font-semibold text-success">${Number(u.balance).toFixed(2)}</td>
                <td className="p-3">${Number(u.deposit_amount).toFixed(2)}</td>
                <td className="p-3"><Badge variant={u.vip_level > 0 ? "default" : "outline"} className={u.vip_level > 0 ? "bg-accent text-accent-foreground" : ""}>{u.vip_level === 0 ? "—" : `VIP ${u.vip_level}`}</Badge></td>
                <td className="p-3 font-mono">{u.today_tasks}/25{u.is_lucky_blocked && <Sparkles className="inline h-3 w-3 ml-1 text-warning" />}</td>
                <td className="p-3 text-xs font-mono max-w-[180px]">
                  {u.wallet ? (
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">{u.wallet.network}</div>
                      <div className="break-all" title={u.wallet.address}>{u.wallet.address.slice(0, 10)}…{u.wallet.address.slice(-6)}</div>
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="p-3"><EditUserDialog user={u} onSaved={load} /></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditUserDialog({ user, onSaved }: { user: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(String(user.balance));
  const [depositAmt, setDepositAmt] = useState(String(user.deposit_amount));
  const [vip, setVip] = useState(String(user.vip_level));
  const [accountType, setAccountType] = useState<string>(user.account_type ?? "real");
  const [busy, setBusy] = useState(false);
  const [luckyOrders, setLuckyOrders] = useState<any[]>([]);

  // Lucky order create form state
  const [loTaskIdx, setLoTaskIdx] = useState("15");
  const [loRecharge, setLoRecharge] = useState("100");
  const [loCommissionPct, setLoCommissionPct] = useState("10");
  const [loBusy, setLoBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  // Wallet edit state
  const [walletAddress, setWalletAddress] = useState(user.wallet?.address ?? "");
  const [walletNetwork, setWalletNetwork] = useState(user.wallet?.network ?? "USDT-TRC20");
  const [walletBusy, setWalletBusy] = useState(false);

  const loadLucky = async () => {
    const { data } = await supabase.from("lucky_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLuckyOrders(data ?? []);
  };

  useEffect(() => { if (open) loadLucky(); }, [open]);

  const save = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({
        balance: Number(balance), deposit_amount: Number(depositAmt), vip_level: Number(vip),
        account_type: accountType,
      }).eq("id", user.id);
      if (error) throw error;
      toast.success("User updated");
      setOpen(false); onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const deactivate = async () => {
    if (!confirm(`Deactivate ${user.username || user.email}? They will not be able to log in or transact. This is reversible.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", user.id);
      if (error) throw error;
      toast.success("Account deactivated");
      setOpen(false); onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const reactivate = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", user.id);
      if (error) throw error;
      toast.success("Account reactivated");
      setOpen(false); onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const resetTasks = async () => {
    if (!confirm("Reset today's task progress to 0/25?")) return;
    const { error } = await supabase.rpc("admin_reset_today_tasks", { _user_id: user.id });
    if (error) toast.error(error.message); else { toast.success("Tasks reset"); onSaved(); }
  };

  const resetWallet = async () => {
    if (!confirm("Reset (clear) the user's bound payout wallet? They will need to re-bind.")) return;
    const { error } = await supabase.rpc("admin_reset_wallet", { _user_id: user.id });
    if (error) toast.error(error.message); else { toast.success("Wallet reset"); onSaved(); }
  };

  const overwritePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 chars"); return; }
    if (!confirm("Overwrite this user's login password?")) return;
    setPwBusy(true);
    try {
      const { adminOverwritePassword } = await import("@/server/admin.functions");
      await adminOverwritePassword({ data: { userId: user.id, newPassword } });
      toast.success("Password updated");
      setNewPassword("");
    } catch (e: any) { toast.error(e.message); }
    finally { setPwBusy(false); }
  };

  const createLucky = async () => {
    if (Number(loRecharge) <= 0) { toast.error("Required top-up must be > 0"); return; }
    const pct = Number(loCommissionPct);
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Commission % must be between 0 and 100"); return; }
    setLoBusy(true);
    try {
      const { error } = await supabase.from("lucky_orders").insert({
        user_id: user.id,
        task_index: Number(loTaskIdx),
        required_recharge: Number(loRecharge),
        commission_pct: pct,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Lucky order added");
      loadLucky();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoBusy(false); }
  };

  const saveWallet = async () => {
    const addr = walletAddress.trim();
    if (!addr) { toast.error("Wallet address cannot be empty"); return; }
    setWalletBusy(true);
    try {
      if (user.wallet?.id) {
        const { error } = await supabase.from("wallets").update({
          address: addr, network: walletNetwork,
        }).eq("id", user.wallet.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wallets").insert({
          user_id: user.id, address: addr, network: walletNetwork,
        });
        if (error) throw error;
      }
      toast.success("Wallet updated");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setWalletBusy(false); }
  };

  const cancelLucky = async (id: string) => {
    const { error } = await supabase.from("lucky_orders").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); loadLucky(); }
  };

  const deleteLucky = async (id: string) => {
    if (!confirm("Delete this lucky order?")) return;
    const { error } = await supabase.from("lucky_orders").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); loadLucky(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="h-3 w-3" /></Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {user.username || user.email}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Balance ($)</Label><Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} /></div>
            <div><Label>Deposit Amount ($)</Label><Input type="number" step="0.01" value={depositAmt} onChange={e => setDepositAmt(e.target.value)} /></div>
            <div><Label>VIP Level</Label>
              <Select value={vip} onValueChange={setVip}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Not VIP</SelectItem>
                  <SelectItem value="1">VIP 1</SelectItem>
                  <SelectItem value="2">VIP 2</SelectItem>
                  <SelectItem value="3">VIP 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Account Type</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="real">Real</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin actions */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="font-semibold text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-accent" />Admin Actions</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={resetTasks}><RefreshCw className="h-3 w-3 mr-1" />Reset Tasks (0/25)</Button>
              <Button size="sm" variant="outline" onClick={resetWallet}><Wallet className="h-3 w-3 mr-1" />Reset Wallet</Button>
            </div>
            <div className="flex gap-2">
              <Input type="password" autoComplete="new-password" name="admin-overwrite-password" placeholder="New password (min 6)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <Button size="sm" onClick={overwritePassword} disabled={pwBusy} variant="outline">
                {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Overwrite"}
              </Button>
            </div>
          </div>

          {/* Wallet edit panel */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm"><Wallet className="h-4 w-4 text-accent" />Payout Wallet</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label className="text-xs">Network</Label>
                <Select value={walletNetwork} onValueChange={setWalletNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT-TRC20">USDT-TRC20</SelectItem>
                    <SelectItem value="USDT-ERC20">USDT-ERC20</SelectItem>
                    <SelectItem value="USDT-BEP20">USDT-BEP20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Address</Label>
                <Input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="Wallet address" className="font-mono text-xs" />
              </div>
            </div>
            <Button size="sm" onClick={saveWallet} disabled={walletBusy} variant="outline" className="w-full">
              {walletBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (user.wallet ? "Update Wallet" : "Set Wallet")}
            </Button>
          </div>

          {/* Lucky Orders panel */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sm"><Sparkles className="h-4 w-4 text-warning" />Lucky Orders</div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Task #</Label><Input type="number" min={1} max={25} value={loTaskIdx} onChange={e => setLoTaskIdx(e.target.value)} /></div>
              <div><Label className="text-xs">Required Top-up ($)</Label><Input type="number" min={1} step="0.01" value={loRecharge} onChange={e => setLoRecharge(e.target.value)} /></div>
              <div><Label className="text-xs">Commission %</Label><Input type="number" min={0} max={100} step="0.01" value={loCommissionPct} onChange={e => setLoCommissionPct(e.target.value)} /></div>
            </div>
            <Button size="sm" onClick={createLucky} disabled={loBusy} className="w-full bg-gradient-primary">
              {loBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />Add Lucky Order</>}
            </Button>
            {luckyOrders.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {luckyOrders.map(lo => (
                  <div key={lo.id} className="flex items-center justify-between rounded border border-border/60 bg-background/50 px-2 py-1.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono">#{lo.task_index}</span>
                      <span>req ${Number(lo.required_recharge).toFixed(2)}</span>
                      {lo.commission_pct != null && <span className="text-primary">{Number(lo.commission_pct)}%</span>}
                      <span className="text-success">cum ${Number(lo.cumulative_deposit ?? 0).toFixed(2)}</span>
                      <Badge variant="outline" className="text-[10px]">{lo.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {lo.status === "pending" && <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => cancelLucky(lo.id)}>Cancel</Button>}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-destructive" onClick={() => deleteLucky(lo.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {user.is_active === false ? (
            <Button variant="outline" onClick={reactivate} disabled={busy} className="border-success/50 text-success"><RefreshCw className="h-4 w-4 mr-1" />Reactivate</Button>
          ) : (
            <Button variant="destructive" onClick={deactivate} disabled={busy}><UserX className="h-4 w-4 mr-1" />Delete (Deactivate)</Button>
          )}
          <Button onClick={save} disabled={busy} className="bg-gradient-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepositsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ids = Array.from(new Set((data ?? []).map((d: any) => d.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,username,email,phone").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems((data ?? []).map((d: any) => ({ ...d, profiles: pmap.get(d.user_id) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, approve: boolean) => {
    const fn = approve ? "approve_deposit" : "reject_deposit";
    const { error } = await supabase.rpc(fn, { _deposit_id: id });
    if (error) toast.error(error.message); else { toast.success(approve ? "Approved" : "Rejected"); load(); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  return <RequestTable items={items} kind="deposit" onAction={act} />;
}

function WithdrawalsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ids = Array.from(new Set((data ?? []).map((d: any) => d.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id,username,email,phone").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems((data ?? []).map((d: any) => ({ ...d, profiles: pmap.get(d.user_id) })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, approve: boolean) => {
    const fn = approve ? "approve_withdrawal" : "reject_withdrawal";
    const { error } = await supabase.rpc(fn, { _w_id: id });
    if (error) toast.error(error.message); else { toast.success(approve ? "Approved" : "Rejected"); load(); }
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;
  return <RequestTable items={items} kind="withdraw" onAction={act} />;
}

function RequestTable({ items, kind, onAction }: { items: any[]; kind: "deposit" | "withdraw"; onAction: (id: string, approve: boolean) => void; }) {
  if (!items.length) return <p className="text-muted-foreground text-sm">No {kind}s yet.</p>;
  return (
    <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto shadow-card-elegant">
      <table className="w-full text-sm">
        <thead className="bg-card/50 border-b border-border">
          <tr className="text-left">
            <th className="p-3">User</th>
            <th className="p-3">Amount</th>
            {kind === "withdraw" && <th className="p-3">Net</th>}
            <th className="p-3">{kind === "deposit" ? "Tx Hash" : "Wallet"}</th>
            <th className="p-3">Network</th>
            <th className="p-3">Date</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-b border-border/40 hover:bg-card/40">
              <td className="p-3"><div className="font-medium">{it.profiles?.username || "—"}</div><div className="text-xs text-muted-foreground">{it.profiles?.email || it.profiles?.phone}</div></td>
              <td className="p-3 font-semibold">${Number(it.amount).toFixed(2)}</td>
              {kind === "withdraw" && <td className="p-3 text-success">${Number(it.net_amount).toFixed(2)}</td>}
              <td className="p-3 text-xs font-mono break-all max-w-[260px]" title={kind === "withdraw" ? it.wallet_address : it.tx_hash}>{kind === "deposit" ? (it.tx_hash || "—") : it.wallet_address}</td>
              <td className="p-3 text-xs">{it.network || "—"}</td>
              <td className="p-3 text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</td>
                <td className="p-3">{(() => {
                  const s = it.status;
                  const cls = s === "approved" ? "bg-success text-success-foreground border-transparent"
                    : s === "rejected" ? "bg-destructive text-destructive-foreground border-transparent"
                    : "bg-warning/20 text-warning border-warning/40";
                  return <Badge variant="outline" className={`uppercase text-xs ${cls}`}>{s}</Badge>;
                })()}</td>
              <td className="p-3">
                {it.status === "pending" ? (
                  <div className="flex gap-1">
                    <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => onAction(it.id, true)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => onAction(it.id, false)}>Reject</Button>
                  </div>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
