import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AdminWallet {
  id: string;
  network: string;
  label: string | null;
  address: string;
  active: boolean;
}

export function AdminWalletsTab() {
  const [items, setItems] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("admin_wallets").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as AdminWallet[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this deposit address? Users will no longer be able to select it.")) return;
    const { error } = await supabase.from("admin_wallets").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const toggleActive = async (it: AdminWallet) => {
    const { error } = await supabase.from("admin_wallets").update({ active: !it.active, updated_at: new Date().toISOString() }).eq("id", it.id);
    if (error) toast.error(error.message); else load();
  };

  if (loading) return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage the crypto deposit addresses users can select on the deposit page.</p>
        <WalletDialog onSaved={load} trigger={<Button className="bg-gradient-primary"><Plus className="h-4 w-4 mr-1" />Add Address</Button>} />
      </div>
      <div className="rounded-xl border border-border bg-gradient-card overflow-x-auto shadow-card-elegant">
        <table className="w-full text-sm">
          <thead className="bg-card/50 border-b border-border">
            <tr className="text-left">
              <th className="p-3">Network</th>
              <th className="p-3">Label</th>
              <th className="p-3">Address</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No deposit addresses yet. Add one to enable user deposits.</td></tr>
            ) : items.map(it => (
              <tr key={it.id} className="border-b border-border/40 hover:bg-card/40">
                <td className="p-3"><Badge variant="outline">{it.network}</Badge></td>
                <td className="p-3">{it.label || <span className="text-muted-foreground">—</span>}</td>
                <td className="p-3 font-mono text-xs break-all max-w-[280px]">{it.address}</td>
                <td className="p-3"><Switch checked={it.active} onCheckedChange={() => toggleActive(it)} /></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <WalletDialog existing={it} onSaved={load} trigger={<Button size="sm" variant="outline"><Pencil className="h-3 w-3" /></Button>} />
                    <Button size="sm" variant="destructive" onClick={() => remove(it.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WalletDialog({ existing, onSaved, trigger }: { existing?: AdminWallet; onSaved: () => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [network, setNetwork] = useState(existing?.network ?? "USDT-TRC20");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!network.trim() || !address.trim()) { toast.error("Network and address are required"); return; }
    setBusy(true);
    try {
      if (existing) {
        const { error } = await supabase.from("admin_wallets").update({
          network: network.trim(), label: label.trim() || null, address: address.trim(), active, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("admin_wallets").insert({
          network: network.trim(), label: label.trim() || null, address: address.trim(), active,
        });
        if (error) throw error;
      }
      toast.success("Saved");
      setOpen(false); onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />{existing ? "Edit" : "Add"} Deposit Address</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Network</Label><Input value={network} onChange={e => setNetwork(e.target.value)} placeholder="USDT-TRC20, USDT-ERC20, BTC, etc." /></div>
          <div><Label>Label (optional)</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Main TRC20 Wallet" /></div>
          <div><Label>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Paste the deposit address" className="font-mono" /></div>
          <div className="flex items-center gap-2"><Switch checked={active} onCheckedChange={setActive} /><Label>Active (visible to users)</Label></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={busy} className="bg-gradient-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
