
-- =========================================
-- 1. PROFILES: new columns
-- =========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','my'));

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Helper: generate unique 8-char alphanumeric referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    _code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = _code) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _code;
END;
$$;

-- Backfill existing users with a referral code
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

-- =========================================
-- 2. LUCKY ORDERS table
-- =========================================
CREATE TABLE IF NOT EXISTS public.lucky_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_index INT NOT NULL CHECK (task_index BETWEEN 1 AND 25),
  required_recharge NUMERIC(12,2) NOT NULL CHECK (required_recharge > 0),
  reward_amount NUMERIC(12,2) NOT NULL CHECK (reward_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','recharged','claimed','cancelled')),
  triggered_at TIMESTAMPTZ,
  recharged_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, task_index, status)
);

CREATE INDEX IF NOT EXISTS idx_lucky_orders_user ON public.lucky_orders(user_id, status);

ALTER TABLE public.lucky_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lucky orders"
  ON public.lucky_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lucky orders"
  ON public.lucky_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 3. UPDATED handle_new_user trigger (referral required)
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_code TEXT;
  _referrer_id UUID;
  _new_code TEXT;
BEGIN
  _ref_code := upper(NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), ''));

  IF _ref_code IS NOT NULL THEN
    SELECT id INTO _referrer_id FROM public.profiles WHERE referral_code = _ref_code;
    IF _referrer_id IS NULL THEN
      RAISE EXCEPTION 'Invalid referral code';
    END IF;
  END IF;

  _new_code := public.generate_referral_code();

  INSERT INTO public.profiles (id, email, phone, username, referred_by, referral_code)
  VALUES (
    NEW.id, NEW.email, NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    _referrer_id, _new_code
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- =========================================
-- 4. UPDATED complete_task — handles lucky orders
-- =========================================
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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.vip_level < 1 THEN RAISE EXCEPTION 'VIP level required to perform tasks'; END IF;
  IF _profile.deposit_amount <= 0 THEN RAISE EXCEPTION 'Deposit required to perform tasks'; END IF;

  SELECT COUNT(*) INTO _count FROM public.task_completions
    WHERE user_id = _uid AND task_day = CURRENT_DATE;
  IF _count >= 25 THEN RAISE EXCEPTION 'Daily task limit (25) reached'; END IF;

  _next_index := _count + 1;

  -- Check for active lucky order at this slot
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
      'reward_amount', _lucky.reward_amount,
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
$$;

-- =========================================
-- 5. UPDATED approve_deposit — auto-claims lucky order
-- =========================================
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d RECORD;
  _lucky RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _d.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.deposits SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_deposit_id;
  UPDATE public.profiles SET balance = balance + _d.amount,
    deposit_amount = deposit_amount + _d.amount, updated_at=now() WHERE id=_d.user_id;

  -- If user had a triggered lucky order with required_recharge <= deposit amount, auto-claim it
  SELECT * INTO _lucky FROM public.lucky_orders
    WHERE user_id = _d.user_id AND status = 'pending'
      AND triggered_at IS NOT NULL
      AND required_recharge <= _d.amount
    ORDER BY triggered_at ASC LIMIT 1 FOR UPDATE;

  IF _lucky.id IS NOT NULL THEN
    -- credit reward and record completion at lucky's task_index
    INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
      VALUES (_d.user_id, NULL, _lucky.task_index, _lucky.reward_amount);
    UPDATE public.profiles SET balance = balance + _lucky.reward_amount,
      total_earned = total_earned + _lucky.reward_amount, updated_at = now()
      WHERE id = _d.user_id;
    UPDATE public.lucky_orders
      SET status = 'claimed', recharged_at = now(), claimed_at = now()
      WHERE id = _lucky.id;
  END IF;
END;
$$;

-- =========================================
-- 6. PIN + WITHDRAWAL functions
-- =========================================
-- Need pgcrypto for crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_withdrawal_pin(_pin TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'PIN must be 6 digits'; END IF;
  UPDATE public.profiles SET withdrawal_pin_hash = crypt(_pin, gen_salt('bf')), updated_at = now()
    WHERE id = _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_pin(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  UPDATE public.profiles SET withdrawal_pin_hash = NULL, updated_at = now() WHERE id = _user_id;
END;
$$;

-- Replace request_withdrawal: now requires PIN + 25 tasks
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _pin TEXT)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF _profile.withdrawal_pin_hash IS NULL THEN
    RAISE EXCEPTION 'Set your 6-digit withdrawal PIN first';
  END IF;
  IF crypt(_pin, _profile.withdrawal_pin_hash) <> _profile.withdrawal_pin_hash THEN
    RAISE EXCEPTION 'Incorrect PIN';
  END IF;

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
$$;

-- =========================================
-- 7. STORAGE: avatars bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
