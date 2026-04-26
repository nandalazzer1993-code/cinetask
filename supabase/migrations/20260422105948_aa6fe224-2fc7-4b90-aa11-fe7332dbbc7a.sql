-- 1. Ensure pgcrypto is enabled (fixes gen_salt error)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS is_lucky_blocked boolean NOT NULL DEFAULT false;

-- 3. Function: user updates their own last_seen
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen = now() WHERE id = auth.uid();
END;
$$;

-- 4. Function: user saves their detected country
CREATE OR REPLACE FUNCTION public.set_user_country(_country text, _country_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.profiles
    SET country = _country, country_code = upper(_country_code), updated_at = now()
    WHERE id = auth.uid();
END;
$$;

-- 5. Update complete_task to support persistent lucky-order blocking across days
CREATE OR REPLACE FUNCTION public.complete_task(_movie_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile RECORD;
  _count INT;
  _rate NUMERIC;
  _reward NUMERIC;
  _next_index INT;
  _lucky RECORD;
  _already INT;
  _effective_day DATE;
  _blocked BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.vip_level < 1 THEN RAISE EXCEPTION 'VIP level required to perform tasks'; END IF;
  IF _profile.deposit_amount <= 0 THEN RAISE EXCEPTION 'Deposit required to perform tasks'; END IF;

  -- Determine if user is currently blocked by an unresolved lucky order
  SELECT COUNT(*) > 0 INTO _blocked FROM public.lucky_orders
    WHERE user_id = _uid AND status = 'pending' AND triggered_at IS NOT NULL;

  -- Sync the flag (in case admin actions changed state)
  IF _blocked <> _profile.is_lucky_blocked THEN
    UPDATE public.profiles SET is_lucky_blocked = _blocked WHERE id = _uid;
  END IF;

  IF _blocked THEN
    RAISE EXCEPTION 'You must recharge to unlock the lucky order before continuing';
  END IF;

  -- If user WAS blocked previously (now cleared), continue from same effective day
  -- Otherwise normal daily reset
  _effective_day := CURRENT_DATE;

  -- Block re-completing the same movie today
  SELECT COUNT(*) INTO _already FROM public.task_completions
    WHERE user_id = _uid AND task_day = _effective_day AND movie_id = _movie_id;
  IF _already > 0 THEN
    RAISE EXCEPTION 'This movie task is already completed today';
  END IF;

  SELECT COUNT(*) INTO _count FROM public.task_completions
    WHERE user_id = _uid AND task_day = _effective_day;
  IF _count >= 25 THEN RAISE EXCEPTION 'Daily task limit (25) reached'; END IF;

  _next_index := _count + 1;

  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _uid AND task_index = _next_index AND status = 'pending'
    LIMIT 1;

  IF _lucky.id IS NOT NULL THEN
    UPDATE public.lucky_orders SET triggered_at = COALESCE(triggered_at, now())
      WHERE id = _lucky.id;
    UPDATE public.profiles SET is_lucky_blocked = true WHERE id = _uid;
    RETURN jsonb_build_object(
      'lucky_order', true,
      'lucky_order_id', _lucky.id,
      'required_recharge', _lucky.required_recharge,
      'commission_pct', _lucky.commission_pct,
      'reward_amount', COALESCE(_lucky.reward_amount, ROUND(_lucky.required_recharge * COALESCE(_lucky.commission_pct,0)/100.0, 2)),
      'task_index', _next_index
    );
  END IF;

  _rate := CASE _profile.vip_level
    WHEN 1 THEN 0.012
    WHEN 2 THEN 0.015
    WHEN 3 THEN 0.020
    ELSE 0 END;
  _reward := ROUND(_profile.deposit_amount * _rate, 2);

  INSERT INTO public.task_completions(user_id, movie_id, task_index, reward, task_day)
    VALUES (_uid, _movie_id, _next_index, _reward, _effective_day);
  UPDATE public.profiles SET balance = balance + _reward,
    total_earned = total_earned + _reward, last_seen = now(), updated_at = now()
    WHERE id = _uid;

  RETURN jsonb_build_object(
    'lucky_order', false,
    'reward', _reward,
    'task_index', _next_index,
    'remaining', 25 - _next_index
  );
END;
$$;

-- 6. Update approve_deposit to clear is_lucky_blocked when lucky order is fulfilled
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d RECORD;
  _lucky RECORD;
  _reward NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _d.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.deposits SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_deposit_id;
  UPDATE public.profiles SET balance = balance + _d.amount,
    deposit_amount = deposit_amount + _d.amount, updated_at=now() WHERE id=_d.user_id;

  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _d.user_id AND status = 'pending'
      AND triggered_at IS NOT NULL
      AND required_recharge <= _d.amount
    ORDER BY triggered_at ASC LIMIT 1 FOR UPDATE;

  IF _lucky.id IS NOT NULL THEN
    IF _lucky.commission_pct IS NOT NULL THEN
      _reward := ROUND(_d.amount * _lucky.commission_pct / 100.0, 2);
    ELSE
      _reward := COALESCE(_lucky.reward_amount, 0);
    END IF;

    INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
      VALUES (_d.user_id, NULL, _lucky.task_index, _reward);
    UPDATE public.profiles SET balance = balance + _reward,
      total_earned = total_earned + _reward, is_lucky_blocked = false, updated_at = now()
      WHERE id = _d.user_id;
    UPDATE public.lucky_orders
      SET status = 'claimed', recharged_at = now(), claimed_at = now(),
          reward_amount = _reward
      WHERE id = _lucky.id;
  ELSE
    -- No matching lucky order; if user had any blocked state with no pending triggered orders, clear
    IF NOT EXISTS (SELECT 1 FROM public.lucky_orders
      WHERE user_id = _d.user_id AND status = 'pending' AND triggered_at IS NOT NULL) THEN
      UPDATE public.profiles SET is_lucky_blocked = false WHERE id = _d.user_id;
    END IF;
  END IF;
END;
$$;

-- 7. Enable realtime for deposits and withdrawals
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;