
-- Ensure pgcrypto for any password hashing utilities
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Profile additions for login tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ip text,
  ADD COLUMN IF NOT EXISTS last_city text,
  ADD COLUMN IF NOT EXISTS last_region text;

-- 2) Login events table for full history (admin-only readable)
CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip text,
  country text,
  country_code text,
  city text,
  region text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_events_user_idx ON public.login_events(user_id, created_at DESC);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read login events" ON public.login_events;
CREATE POLICY "Admins read login events" ON public.login_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read own login events" ON public.login_events;
CREATE POLICY "Users read own login events" ON public.login_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Inserts will go through SECURITY DEFINER RPC; no insert policy needed.

-- 3) Server-side RPC to record a login event + bump counters
CREATE OR REPLACE FUNCTION public.record_login_event(
  _ip text, _country text, _country_code text, _city text, _region text, _user_agent text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.login_events(user_id, ip, country, country_code, city, region, user_agent)
    VALUES (_uid, _ip, _country, upper(NULLIF(_country_code,'')), _city, _region, _user_agent);
  UPDATE public.profiles SET
    login_count = login_count + 1,
    last_ip = COALESCE(_ip, last_ip),
    last_city = COALESCE(_city, last_city),
    last_region = COALESCE(_region, last_region),
    country = COALESCE(_country, country),
    country_code = COALESCE(upper(NULLIF(_country_code,'')), country_code),
    last_seen = now(),
    updated_at = now()
  WHERE id = _uid;
END;
$$;

-- 4) Admin RPCs: reset today's tasks, reset wallet
CREATE OR REPLACE FUNCTION public.admin_reset_today_tasks(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  DELETE FROM public.task_completions
    WHERE user_id = _user_id AND task_day = CURRENT_DATE;
  UPDATE public.profiles SET is_lucky_blocked = false, updated_at = now() WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_wallet(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  DELETE FROM public.wallets WHERE user_id = _user_id;
END;
$$;

-- 5) Cumulative lucky-order deposits
-- Add a cumulative tracker on lucky_orders
ALTER TABLE public.lucky_orders
  ADD COLUMN IF NOT EXISTS cumulative_deposit numeric NOT NULL DEFAULT 0;

-- Replace approve_deposit to handle cumulative lucky-order resolution.
-- VIP-1 commission is 1.2%, VIP-2 1.5%, VIP-3 2.0%. Lucky-order resolution
-- now sums approved deposits since the lucky order was triggered until they
-- meet/exceed required_recharge. Reward is paid out using the user's VIP rate
-- (commission_pct kept on the row only as override; the new flow uses
-- the user's VIP commission applied to the total required_recharge).
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _d RECORD;
  _lucky RECORD;
  _new_cum numeric;
  _profile RECORD;
  _rate numeric;
  _reward numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _d.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  UPDATE public.deposits SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_deposit_id;
  UPDATE public.profiles SET balance = balance + _d.amount,
    deposit_amount = deposit_amount + _d.amount, updated_at=now() WHERE id=_d.user_id;

  -- Find oldest pending triggered lucky order for this user
  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _d.user_id AND status = 'pending' AND triggered_at IS NOT NULL
    ORDER BY triggered_at ASC LIMIT 1 FOR UPDATE;

  IF _lucky.id IS NOT NULL THEN
    _new_cum := COALESCE(_lucky.cumulative_deposit, 0) + _d.amount;
    UPDATE public.lucky_orders SET cumulative_deposit = _new_cum WHERE id = _lucky.id;

    IF _new_cum >= _lucky.required_recharge THEN
      SELECT * INTO _profile FROM public.profiles WHERE id = _d.user_id FOR UPDATE;
      _rate := CASE _profile.vip_level
        WHEN 1 THEN 0.012 WHEN 2 THEN 0.015 WHEN 3 THEN 0.020 ELSE 0.012 END;
      _reward := ROUND(_lucky.required_recharge * _rate, 2);

      INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
        VALUES (_d.user_id, NULL, _lucky.task_index, _reward);
      UPDATE public.profiles SET balance = balance + _reward,
        total_earned = total_earned + _reward, is_lucky_blocked = false, updated_at = now()
        WHERE id = _d.user_id;
      UPDATE public.lucky_orders
        SET status = 'claimed', recharged_at = now(), claimed_at = now(), reward_amount = _reward
        WHERE id = _lucky.id;
    END IF;
  END IF;
END;
$$;
