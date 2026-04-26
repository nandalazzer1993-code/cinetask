-- 1. Admin-managed crypto deposit addresses
CREATE TABLE public.admin_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL,
  label TEXT,
  address TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active deposit addresses"
  ON public.admin_wallets FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage deposit addresses"
  ON public.admin_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Profile flags: real/demo + active (soft-delete)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'real',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check CHECK (account_type IN ('real','demo'));

-- 3. Withdrawal RPC: drop PIN requirement, keep 25-task gate
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric, text);

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _w RECORD;
  _profile RECORD;
  _fee NUMERIC;
  _net NUMERIC;
  _id UUID;
  _today_count INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id=_uid FOR UPDATE;
  IF NOT _profile.is_active THEN RAISE EXCEPTION 'Account is deactivated'; END IF;

  SELECT COUNT(*) INTO _today_count FROM public.task_completions
    WHERE user_id=_uid AND task_day = CURRENT_DATE;
  IF _today_count < 25 THEN
    RAISE EXCEPTION 'Complete all 25 tasks today before withdrawing (% / 25)', _today_count;
  END IF;

  IF _profile.balance < _amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  SELECT * INTO _w FROM public.wallets WHERE user_id=_uid;
  IF _w IS NULL THEN RAISE EXCEPTION 'Bind a wallet address first'; END IF;

  _fee := ROUND(_amount * 0.05, 2);
  _net := _amount - _fee;
  UPDATE public.profiles SET balance = balance - _amount, updated_at=now() WHERE id=_uid;
  INSERT INTO public.withdrawals(user_id, amount, fee, net_amount, wallet_address, network)
    VALUES (_uid, _amount, _fee, _net, _w.address, _w.network)
    RETURNING id INTO _id;
  RETURN _id;
END;
$function$;