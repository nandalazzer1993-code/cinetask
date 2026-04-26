import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  component: () => <RequireAuth><WalletPage /></RequireAuth>,
});

const NETWORKS = ["TRC20 (USDT)", "ERC20 (USDT)", "BEP20 (USDT)", "BTC", "Solana"];

interface AdminWallet { id: string; network: string; label: string | null; address: string }

function WalletPage() {
  const { profile, user, refresh } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [adminWallets, setAdminWallets] = useState<AdminWallet[]>([]);
  const [selectedAdminWalletId, setSelectedAdminWalletId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [bindAddr, setBindAddr] = useState("");
  const [bindNet, setBindNet] = useState(NETWORKS[0]);
  const [binding, setBinding] = useState(false);

  const [depAmt, setDepAmt] = useState("");
  const [depTx, setDepTx] = useState("");
  const [depBusy, setDepBusy] = useState(false);

  const [wdAmt, setWdAmt] = useState("");
  const [wdBusy, setWdBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState("");

  const load = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const [w, d, wd, tc, aw] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("task_completions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("task_day", today),
      supabase.from("admin_wallets").select("id,network,label,address").eq("active", true).order("created_at", { ascending: true }),
    ]);
    setWallet(w.data);
    setDeposits(d.data ?? []);
    setWithdrawals(wd.data ?? []);
    setTodayCount(tc.count ?? 0);
    const list = (aw.data as AdminWallet[]) ?? [];
    setAdminWallets(list);
    if (list.length && !selectedAdminWalletId) setSelectedAdminWalletId(list[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const selectedAdminWallet = adminWallets.find(a => a.id === selectedAdminWalletId);

  const copyAddress = async () => {
    if (!selectedAdminWallet) return;
    try {
      await navigator.clipboard.writeText(selectedAdminWallet.address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Failed to copy"); }
  };

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindAddr.trim() || bindAddr.trim().length < 10) { toast.error("Enter a valid wallet address"); return; }
    setBinding(true);
    try {
      const { error } = await supabase.from("wallets").insert({
        user_id: user!.id, address: bindAddr.trim(), network: bindNet, locked: true,
      });
      if (error) throw error;
      toast.success("Wallet bound and locked. Contact admin to change.");
      await load();
    } catch (err: any) { toast.error(err.message || "Failed to bind wallet"); }
    finally { setBinding(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(depAmt);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!selectedAdminWallet) { toast.error("Select a deposit address"); return; }
    setDepBusy(true);
    try {
      const { error } = await supabase.from("deposits").insert({
        user_id: user!.id, amount: amt, tx_hash: depTx.trim() || null, network: selectedAdminWallet.network,
      });
      if (error) throw error;
      toast.success("Deposit request submitted for review");
      setDepAmt(""); setDepTx("");
      await load();
    } catch (err: any) { toast.error(err.message); }
    finally { setDepBusy(false); }
  };

  const openWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(wdAmt);
    if (!amt || amt < 10) { toast.error("Minimum withdrawal is $10"); return; }
    if (!wallet) { toast.error("Bind a wallet first"); return; }
    if (todayCount < 25) { toast.error(`Complete all 25 tasks today first (${todayCount}/25)`); return; }
    setPassword(""); setPwOpen(true);
  };

  const submitWithdraw = async () => {
    if (!password) { toast.error("Enter your login password"); return; }
    if (!user?.email) { toast.error("Account email is required for verification"); return; }
    setWdBusy(true);
    try {
      // Re-verify the password via signInWithPassword (no session change since same user)
      const { error: pwErr } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (pwErr) throw new Error("Incorrect password");

      const { error } = await supabase.rpc("request_withdrawal", { _amount: Number(wdAmt) });
      if (error) throw error;
      toast.success("Withdrawal request submitted");
      setWdAmt(""); setPwOpen(false); setPassword("");
      await Promise.all([load(), refresh()]);
    } catch (err: any) { toast.error(err.message); }
    finally { setWdBusy(false); }
  };

  if (loading || !profile) return <div className="min-h-screen"><Navbar /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>;

  const fee = wdAmt ? (Number(wdAmt) * 0.05).toFixed(2) : "0.00";
  const net = wdAmt ? (Number(wdAmt) * 0.95).toFixed(2) : "0.00";
  const canWithdraw = !!wallet && todayCount >= 25;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2"><WalletIcon className="h-7 w-7 text-primary" />Wallet</h1>
          <p className="text-muted-foreground mt-1">Manage your wallet, deposits, and withdrawals</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <StatBox label="Balance" value={`$${Number(profile.balance).toFixed(2)}`} accent="text-success" />
          <StatBox label="Active Deposit" value={`$${Number(profile.deposit_amount).toFixed(2)}`} accent="text-accent" />
          <StatBox label="Total Earned" value={`$${Number(profile.total_earned).toFixed(2)}`} accent="text-primary" />
        </div>

        {/* Wallet binding (user's payout wallet) */}
        <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant mb-6">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><ShieldCheck className="h-5 w-5 text-accent" />Your Payout Wallet</h2>
          {wallet ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-warning" /><Badge variant="outline" className="border-warning/50 text-warning">LOCKED</Badge><span className="text-muted-foreground text-xs">Only admin can change this</span></div>
              <div className="rounded-lg border border-border bg-background p-4 break-all font-mono text-sm">{wallet.address}</div>
              <div className="text-sm text-muted-foreground">Network: <span className="text-foreground font-medium">{wallet.network}</span></div>
            </div>
          ) : (
            <form onSubmit={handleBind} className="space-y-4">
              <p className="text-sm text-muted-foreground">⚠️ This is a one-time setup. Once saved, you cannot change your wallet address. Only admin can reset it.</p>
              <div><Label>Network</Label>
                <Select value={bindNet} onValueChange={setBindNet}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Wallet Address</Label><Input value={bindAddr} onChange={e => setBindAddr(e.target.value)} placeholder="Paste your wallet address" /></div>
              <Button type="submit" disabled={binding} className="bg-gradient-primary shadow-glow">
                {binding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Lock className="h-4 w-4 mr-2" />Bind & Lock Wallet</>}
              </Button>
            </form>
          )}
        </div>

        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="deposit"><ArrowDownToLine className="h-4 w-4 mr-2" />Deposit</TabsTrigger>
            <TabsTrigger value="withdraw"><ArrowUpFromLine className="h-4 w-4 mr-2" />Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit">
            <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
              {/* Deposit address selector */}
              <div className="mb-6 space-y-3">
                <h3 className="font-semibold text-sm">Send your deposit to one of these addresses:</h3>
                {adminWallets.length === 0 ? (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
                    No deposit addresses are available right now. Please contact support.
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Choose Network</Label>
                      <Select value={selectedAdminWalletId} onValueChange={setSelectedAdminWalletId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {adminWallets.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.network}{a.label ? ` — ${a.label}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedAdminWallet && (
                      <div className="rounded-lg border border-border bg-background p-3 flex items-center gap-2">
                        <code className="flex-1 break-all font-mono text-xs">{selectedAdminWallet.address}</code>
                        <Button type="button" size="sm" variant="outline" onClick={copyAddress} className="shrink-0">
                          {copied ? <><Check className="h-3 w-3 mr-1 text-success" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <form onSubmit={handleDeposit} className="grid gap-4 md:grid-cols-2 mb-6">
                <div><Label>Amount (USD)</Label><Input type="number" min="1" step="0.01" value={depAmt} onChange={e => setDepAmt(e.target.value)} required /></div>
                <div><Label>Network</Label>
                  <Input value={selectedAdminWallet?.network ?? ""} readOnly disabled />
                </div>
                <div className="md:col-span-2"><Label>Transaction Hash (optional)</Label><Input value={depTx} onChange={e => setDepTx(e.target.value)} placeholder="Provide tx hash to speed up review" /></div>
                <div className="md:col-span-2"><Button type="submit" disabled={depBusy || !selectedAdminWallet} className="w-full bg-gradient-primary shadow-glow">{depBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Deposit"}</Button></div>
              </form>

              <h3 className="font-semibold mb-3">Deposit History</h3>
              <RequestList items={deposits} kind="deposit" />
            </div>
          </TabsContent>

          <TabsContent value="withdraw">
            <div className="rounded-2xl border border-border bg-gradient-card p-6 shadow-card-elegant">
              {!wallet ? (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning">Bind a payout wallet address before withdrawing.</div>
              ) : (
                <>
                  <div className="rounded-lg bg-background/50 border border-border p-3 text-sm mb-4">
                    <div className="text-xs text-muted-foreground">Today's tasks</div>
                    <div className={`font-mono font-semibold ${todayCount >= 25 ? "text-success" : "text-warning"}`}>{todayCount} / 25</div>
                  </div>
                  {todayCount < 25 && (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning mb-4">
                      You must complete all 25 tasks today before withdrawing.
                    </div>
                  )}
                  <form onSubmit={openWithdraw} className="space-y-4 mb-6">
                    <div className="rounded-lg bg-background/50 border border-border p-3 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">To wallet:</span><span className="font-mono text-xs truncate ml-2">{wallet.address.slice(0, 10)}...{wallet.address.slice(-6)}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-muted-foreground">Network:</span><span>{wallet.network}</span></div>
                    </div>
                    <div><Label>Amount to Withdraw (min $10)</Label><Input type="number" min="10" step="0.01" value={wdAmt} onChange={e => setWdAmt(e.target.value)} required /></div>
                    <div className="rounded-lg bg-background/50 border border-border p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Withdrawal fee (5%)</span><span>-${fee}</span></div>
                      <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>You receive</span><span className="text-success">${net}</span></div>
                    </div>
                    <Button type="submit" disabled={!canWithdraw} className="w-full bg-gradient-primary shadow-glow">Request Withdrawal</Button>
                  </form>
                </>
              )}
              <h3 className="font-semibold mb-3">Withdrawal History</h3>
              <RequestList items={withdrawals} kind="withdraw" />
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Confirm with Password</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground text-center">Withdrawing <span className="text-foreground font-semibold">${wdAmt}</span></p>
              <div>
                <Label>Login Password</Label>
                <Input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your account password" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPwOpen(false)}>Cancel</Button>
              <Button onClick={submitWithdraw} disabled={wdBusy || !password} className="bg-gradient-primary">
                {wdBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Withdrawal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-5 shadow-card-elegant">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function RequestList({ items, kind }: { items: any[]; kind: "deposit" | "withdraw" }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No {kind}s yet.</p>;
  const statusClass = (s: string) =>
    s === "approved" ? "bg-success text-success-foreground border-transparent"
    : s === "rejected" ? "bg-destructive text-destructive-foreground border-transparent"
    : "bg-warning/20 text-warning border-warning/40";
  return (
    <div className="space-y-2">
      {items.map(it => (
        <div key={it.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3 text-sm">
          <div>
            <div className="font-semibold">${Number(it.amount).toFixed(2)}{kind === "withdraw" && <span className="text-muted-foreground ml-2 text-xs">net ${Number(it.net_amount).toFixed(2)}</span>}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{new Date(it.created_at).toLocaleString()}</div>
          </div>
          <Badge variant="outline" className={`uppercase text-xs ${statusClass(it.status)}`}>
            {it.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}
