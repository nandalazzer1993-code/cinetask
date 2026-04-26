import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/use-presence";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  deposit_amount: number;
  vip_level: number;
  total_earned: number;
  avatar_url?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  language?: string;
  withdrawal_pin_hash?: string | null;
  country?: string | null;
  country_code?: string | null;
  last_seen?: string | null;
  is_lucky_blocked?: boolean;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
  };

  const recordLoginEvent = async () => {
    try {
      let geo: any = {};
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (r.ok) geo = await r.json();
      } catch { /* ignore */ }
      await supabase.rpc("record_login_event", {
        _ip: geo.ip ?? "",
        _country: geo.country_name ?? "",
        _country_code: geo.country_code ?? "",
        _city: geo.city ?? "",
        _region: geo.region ?? "",
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
    } catch { /* non-fatal */ }
  };


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
        if (event === "SIGNED_IN") {
          setTimeout(() => recordLoginEvent(), 0);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user]);

  // Presence + realtime notifications
  usePresence(user?.id);
  useRealtimeNotifications({ userId: user?.id, isAdmin, onChange: refresh });

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider value={{ user, session, profile, isAdmin, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
