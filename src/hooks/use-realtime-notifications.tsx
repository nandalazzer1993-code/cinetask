import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribes to realtime updates:
 * - Admins: notified when a new withdrawal or deposit is created
 * - Users: notified when their own withdrawal/deposit status changes
 */
export function useRealtimeNotifications(opts: {
  userId: string | null | undefined;
  isAdmin: boolean;
  onChange?: () => void;
}) {
  const { userId, isAdmin, onChange } = opts;

  useEffect(() => {
    if (!userId) return;
    const channels: any[] = [];

    if (isAdmin) {
      const adminCh = supabase
        .channel("admin-tx-feed")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, (payload: any) => {
          toast.info(`New withdrawal: $${Number(payload.new.amount).toFixed(2)}`);
          onChange?.();
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "deposits" }, (payload: any) => {
          toast.info(`New deposit: $${Number(payload.new.amount).toFixed(2)}`);
          onChange?.();
        })
        .subscribe();
      channels.push(adminCh);
    }

    const userCh = supabase
      .channel(`user-tx-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "withdrawals", filter: `user_id=eq.${userId}` }, (payload: any) => {
        const s = payload.new.status;
        if (s === "approved") toast.success(`Withdrawal of $${Number(payload.new.amount).toFixed(2)} approved`);
        else if (s === "rejected") toast.error(`Withdrawal of $${Number(payload.new.amount).toFixed(2)} rejected`);
        onChange?.();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deposits", filter: `user_id=eq.${userId}` }, (payload: any) => {
        const s = payload.new.status;
        if (s === "approved") toast.success(`Deposit of $${Number(payload.new.amount).toFixed(2)} approved`);
        else if (s === "rejected") toast.error(`Deposit of $${Number(payload.new.amount).toFixed(2)} rejected`);
        onChange?.();
      })
      .subscribe();
    channels.push(userCh);

    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [userId, isAdmin, onChange]);
}

export function countryFlag(code?: string | null) {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (code.toUpperCase().charCodeAt(0) - 65))
    + String.fromCodePoint(A + (code.toUpperCase().charCodeAt(1) - 65));
}
