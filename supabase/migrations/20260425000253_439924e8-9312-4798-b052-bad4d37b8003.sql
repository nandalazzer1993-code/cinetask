CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _d.user_id AND status = 'pending' AND triggered_at IS NOT NULL
    ORDER BY triggered_at ASC LIMIT 1 FOR UPDATE;

  IF _lucky.id IS NOT NULL THEN
    _new_cum := COALESCE(_lucky.cumulative_deposit, 0) + _d.amount;
    UPDATE public.lucky_orders SET cumulative_deposit = _new_cum WHERE id = _lucky.id;

    IF _new_cum >= _lucky.required_recharge THEN
      SELECT * INTO _profile FROM public.profiles WHERE id = _d.user_id FOR UPDATE;
      -- Prefer the lucky order's custom commission percentage if set, else fall back to VIP rate
      IF _lucky.commission_pct IS NOT NULL THEN
        _rate := _lucky.commission_pct / 100.0;
      ELSE
        _rate := CASE _profile.vip_level
          WHEN 1 THEN 0.012 WHEN 2 THEN 0.015 WHEN 3 THEN 0.020 ELSE 0.012 END;
      END IF;
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
$function$;

-- Allow admins to update wallets table too (already exists). Add admin upsert path:
-- Admins already can UPDATE/DELETE wallets. Add INSERT for admins so they can create on user's behalf.
DROP POLICY IF EXISTS "Admins insert wallets" ON public.wallets;
CREATE POLICY "Admins insert wallets" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
