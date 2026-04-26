import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const COUNTRY_KEY = "lp_country_set_v1";

/**
 * Tracks user presence:
 * - Detects country via ip-api.com (once per session)
 * - Heartbeats `last_seen` every 60s while the tab is open
 */
export function usePresence(userId: string | null | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const touch = () => { supabase.rpc("touch_last_seen").then(() => {}); };

    // initial heartbeat
    touch();

    // detect country once per session
    if (!sessionStorage.getItem(COUNTRY_KEY)) {
      fetch("https://ip-api.com/json/?fields=status,country,countryCode")
        .then((r) => r.json())
        .then((d) => {
          if (d?.status === "success" && d.country && d.countryCode) {
            supabase.rpc("set_user_country", {
              _country: d.country,
              _country_code: d.countryCode,
            });
            sessionStorage.setItem(COUNTRY_KEY, "1");
          }
        })
        .catch(() => {});
    }

    intervalRef.current = setInterval(touch, 60_000);
    const onFocus = () => touch();
    window.addEventListener("focus", onFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);
}
