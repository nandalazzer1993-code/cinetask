-- 1. Add category to movies
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'latest';
ALTER TABLE public.movies DROP CONSTRAINT IF EXISTS movies_category_check;
ALTER TABLE public.movies ADD CONSTRAINT movies_category_check CHECK (category IN ('latest','upcoming','trending'));

-- 2. Add commission_pct to lucky_orders (percentage of required_recharge that becomes reward)
ALTER TABLE public.lucky_orders ADD COLUMN IF NOT EXISTS commission_pct numeric;
-- Backfill: derive pct from existing reward_amount/required_recharge
UPDATE public.lucky_orders SET commission_pct = ROUND((reward_amount / NULLIF(required_recharge,0)) * 100, 2)
  WHERE commission_pct IS NULL;
-- Make reward_amount nullable since reward is now derived from actual deposit
ALTER TABLE public.lucky_orders ALTER COLUMN reward_amount DROP NOT NULL;

-- 3. Update approve_deposit: compute lucky reward from commission_pct * deposited amount
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Reward = commission_pct% of the actual deposit (or fallback to stored reward_amount)
    IF _lucky.commission_pct IS NOT NULL THEN
      _reward := ROUND(_d.amount * _lucky.commission_pct / 100.0, 2);
    ELSE
      _reward := COALESCE(_lucky.reward_amount, 0);
    END IF;

    INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
      VALUES (_d.user_id, NULL, _lucky.task_index, _reward);
    UPDATE public.profiles SET balance = balance + _reward,
      total_earned = total_earned + _reward, updated_at = now()
      WHERE id = _d.user_id;
    UPDATE public.lucky_orders
      SET status = 'claimed', recharged_at = now(), claimed_at = now(),
          reward_amount = _reward
      WHERE id = _lucky.id;
  END IF;
END;
$function$;

-- 4. Update complete_task: report commission_pct (preview reward based on required_recharge)
CREATE OR REPLACE FUNCTION public.complete_task(_movie_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _profile RECORD;
  _count INT;
  _rate NUMERIC;
  _reward NUMERIC;
  _next_index INT;
  _lucky RECORD;
  _already INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.vip_level < 1 THEN RAISE EXCEPTION 'VIP level required to perform tasks'; END IF;
  IF _profile.deposit_amount <= 0 THEN RAISE EXCEPTION 'Deposit required to perform tasks'; END IF;

  -- Block if any pending lucky order is currently triggered
  SELECT COUNT(*) INTO _already FROM public.lucky_orders
    WHERE user_id = _uid AND status = 'pending' AND triggered_at IS NOT NULL;
  IF _already > 0 THEN
    RAISE EXCEPTION 'You must recharge to unlock the lucky order before continuing';
  END IF;

  -- Block re-completing the same movie today
  SELECT COUNT(*) INTO _already FROM public.task_completions
    WHERE user_id = _uid AND task_day = CURRENT_DATE AND movie_id = _movie_id;
  IF _already > 0 THEN
    RAISE EXCEPTION 'This movie task is already completed today';
  END IF;

  SELECT COUNT(*) INTO _count FROM public.task_completions
    WHERE user_id = _uid AND task_day = CURRENT_DATE;
  IF _count >= 25 THEN RAISE EXCEPTION 'Daily task limit (25) reached'; END IF;

  _next_index := _count + 1;

  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _uid AND task_index = _next_index AND status = 'pending'
    LIMIT 1;

  IF _lucky.id IS NOT NULL THEN
    UPDATE public.lucky_orders SET triggered_at = COALESCE(triggered_at, now())
      WHERE id = _lucky.id;
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

  INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
    VALUES (_uid, _movie_id, _next_index, _reward);
  UPDATE public.profiles SET balance = balance + _reward,
    total_earned = total_earned + _reward, updated_at = now()
    WHERE id = _uid;

  RETURN jsonb_build_object(
    'lucky_order', false,
    'reward', _reward,
    'task_index', _next_index,
    'remaining', 25 - _next_index
  );
END;
$function$;