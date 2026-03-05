-- 1) subscriptions normalization
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS plan_id text,
  ADD COLUMN IF NOT EXISTS status text;

-- 2) latest subscription per user
CREATE OR REPLACE VIEW public.v_latest_subscription_per_user AS
SELECT DISTINCT ON (s.user_id)
  s.user_id,
  COALESCE(s.plan_id, 'free') AS plan_id,
  s.status,
  s.current_period_end,
  s.created_at
FROM public.subscriptions s
ORDER BY
  s.user_id,
  COALESCE(s.current_period_end, to_timestamp(0)) DESC,
  COALESCE(s.created_at, to_timestamp(0)) DESC;

-- 3) admin view
CREATE OR REPLACE VIEW public.v_admin_users_with_plan AS
SELECT
  p.id                         AS user_id,
  au.email                     AS email,
  p.full_name                  AS full_name,
  p.role                       AS role,
  COALESCE(v.plan_id, 'free')  AS plan_id,
  v.status,
  v.current_period_end
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
LEFT JOIN public.v_latest_subscription_per_user v ON v.user_id = p.id;

-- 4) referral core
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id),
  code text UNIQUE NOT NULL,
  max_uses int,
  uses int DEFAULT 0,
  expires_at timestamptz,
  allowed_plans text[] DEFAULT '{}',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.referral_codes(code),
  referrer_user_id uuid REFERENCES auth.users(id),
  referred_user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending',
  credited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (code, referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.promo_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  source text CHECK (source IN ('referral','promo','streak','manual')),
  amount_cents int NOT NULL,
  currency text NOT NULL,
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text REFERENCES public.referral_codes(code),
  referrer_user_id uuid REFERENCES auth.users(id),
  anonymous_id text,
  first_touch_at timestamptz DEFAULT now(),
  last_touch_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 5) promo codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text CHECK (type IN ('percent','fixed')) NOT NULL,
  value numeric NOT NULL,
  currency text,
  max_redemptions int,
  redemptions int DEFAULT 0,
  per_user_limit int DEFAULT 1,
  valid_from timestamptz,
  valid_to timestamptz,
  allowed_plans text[] DEFAULT '{}',
  apply_cycles int DEFAULT 1,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.promo_codes(code),
  user_id uuid REFERENCES auth.users(id),
  payment_id text,
  amount_cents int NOT NULL,
  currency text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 6) RLS (public read, owner-only where needed)
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_public_refcodes" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "own_manage_refcodes" ON public.referral_codes FOR ALL USING (auth.uid() = owner_user_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_promos" ON public.promo_codes FOR SELECT USING (true);

ALTER TABLE public.promo_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_ledger" ON public.promo_ledger FOR SELECT USING (auth.uid() = user_id);
