-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  email TEXT,
  phone TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  vip_level INT NOT NULL DEFAULT 0,
  total_earned NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile basic" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, username)
  VALUES (NEW.id, NEW.email, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Wallets (one per user, lockable)
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own wallet once" ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update wallets" ON public.wallets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete wallets" ON public.wallets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Deposits
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  tx_hash TEXT,
  network TEXT,
  note TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposits" ON public.deposits FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert deposits" ON public.deposits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update deposits" ON public.deposits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 10),
  fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert withdrawals" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Movies catalog
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  poster_url TEXT,
  trailer_url TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active movies" ON public.movies FOR SELECT TO authenticated
  USING (active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage movies" ON public.movies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Task completions
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  movie_id UUID REFERENCES public.movies(id),
  task_day DATE NOT NULL DEFAULT CURRENT_DATE,
  task_index INT NOT NULL,
  reward NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_day, task_index)
);
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tasks" ON public.task_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own tasks" ON public.task_completions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to complete a task atomically (enforce 25/day, calculate reward, credit balance)
CREATE OR REPLACE FUNCTION public.complete_task(_movie_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _profile RECORD;
  _count INT;
  _rate NUMERIC;
  _reward NUMERIC;
  _next_index INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _profile.vip_level < 1 THEN RAISE EXCEPTION 'VIP level required to perform tasks'; END IF;
  IF _profile.deposit_amount <= 0 THEN RAISE EXCEPTION 'Deposit required to perform tasks'; END IF;

  SELECT COUNT(*) INTO _count FROM public.task_completions
    WHERE user_id = _uid AND task_day = CURRENT_DATE;
  IF _count >= 25 THEN RAISE EXCEPTION 'Daily task limit (25) reached'; END IF;

  _rate := CASE _profile.vip_level
    WHEN 1 THEN 0.012
    WHEN 2 THEN 0.015
    WHEN 3 THEN 0.020
    ELSE 0 END;
  _reward := ROUND(_profile.deposit_amount * _rate, 2);
  _next_index := _count + 1;

  INSERT INTO public.task_completions(user_id, movie_id, task_index, reward)
    VALUES (_uid, _movie_id, _next_index, _reward);
  UPDATE public.profiles SET balance = balance + _reward,
    total_earned = total_earned + _reward, updated_at = now()
    WHERE id = _uid;

  RETURN jsonb_build_object('reward', _reward, 'task_index', _next_index, 'remaining', 25 - _next_index);
END;
$$;

-- Function for admin to approve a deposit (credits balance + sets deposit_amount)
CREATE OR REPLACE FUNCTION public.approve_deposit(_deposit_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _d RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _d FROM public.deposits WHERE id = _deposit_id FOR UPDATE;
  IF _d.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.deposits SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_deposit_id;
  UPDATE public.profiles SET balance = balance + _d.amount,
    deposit_amount = deposit_amount + _d.amount, updated_at=now() WHERE id=_d.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_deposit(_deposit_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  UPDATE public.deposits SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now()
    WHERE id=_deposit_id AND status='pending';
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(_w_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id=_w_id FOR UPDATE;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.withdrawals SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_w_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(_w_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _w RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO _w FROM public.withdrawals WHERE id=_w_id FOR UPDATE;
  IF _w.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;
  UPDATE public.withdrawals SET status='rejected', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_w_id;
  -- Refund balance
  UPDATE public.profiles SET balance = balance + _w.amount, updated_at=now() WHERE id=_w.user_id;
END;
$$;

-- Withdrawal request function (5% fee, $10 min, locks address)
CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount NUMERIC)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _w RECORD;
  _profile RECORD;
  _fee NUMERIC;
  _net NUMERIC;
  _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;
  SELECT * INTO _profile FROM public.profiles WHERE id=_uid FOR UPDATE;
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

-- Seed movie trailers
INSERT INTO public.movies (title, poster_url, trailer_url, description) VALUES
('Inception', 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', 'https://www.youtube.com/embed/YoHD9XEInc0', 'A thief who steals corporate secrets through dream-sharing technology.'),
('Interstellar', 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'https://www.youtube.com/embed/zSWdZVtXT7E', 'A team of explorers travel through a wormhole in space.'),
('The Dark Knight', 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', 'https://www.youtube.com/embed/EXeTwQWrcwY', 'Batman faces the Joker in Gotham City.'),
('Dune', 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 'https://www.youtube.com/embed/n9xhJrPXop4', 'Paul Atreides leads nomadic tribes in a revolt.'),
('Oppenheimer', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://www.youtube.com/embed/uYPbbksJxIg', 'The story of J. Robert Oppenheimer and the atomic bomb.'),
('The Matrix', 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 'https://www.youtube.com/embed/vKQi3bBA1y8', 'A computer hacker learns about the true nature of reality.'),
('Avatar', 'https://image.tmdb.org/t/p/w500/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg', 'https://www.youtube.com/embed/5PSNL1qE6VY', 'A paraplegic Marine on planet Pandora.'),
('Tenet', 'https://image.tmdb.org/t/p/w500/k68nPLbIST6NP96JmTxmZijEvCA.jpg', 'https://www.youtube.com/embed/L3pk_TBkihU', 'Armed with only one word, Tenet, a protagonist fights for survival.'),
('Joker', 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', 'https://www.youtube.com/embed/zAGVQLHvwOY', 'In Gotham City, mentally troubled comedian Arthur Fleck.'),
('Top Gun Maverick', 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', 'https://www.youtube.com/embed/qSqVVswa420', 'After more than thirty years of service, Maverick returns.');
