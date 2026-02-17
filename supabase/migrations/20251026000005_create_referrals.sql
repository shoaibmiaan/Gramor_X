-- 20251026000005_create_referrals_safe.sql
-- Safe, idempotent normalised referral + credit ledger schema

-- Create referral_codes table if not exists
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  deactivated_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Index for referral_codes
CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON public.referral_codes (code);

-- Enable RLS
ALTER TABLE IF EXISTS public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Policies for referral_codes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_codes' AND policyname = 'referral_codes_self_select'
  ) THEN
    CREATE POLICY "referral_codes_self_select"
      ON public.referral_codes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_codes' AND policyname = 'referral_codes_self_insert'
  ) THEN
    CREATE POLICY "referral_codes_self_insert"
      ON public.referral_codes
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_codes' AND policyname = 'referral_codes_self_update'
  ) THEN
    CREATE POLICY "referral_codes_self_update"
      ON public.referral_codes
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Create referral_redemptions table if not exists
CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id bigserial PRIMARY KEY,
  code text NOT NULL REFERENCES public.referral_codes(code) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_hash text,
  referrer_credit integer NOT NULL DEFAULT 0,
  referred_credit integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  context text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  confirmed_at timestamptz
);

-- Indexes for referral_redemptions
CREATE INDEX IF NOT EXISTS referral_redemptions_code_idx ON public.referral_redemptions (code);
CREATE INDEX IF NOT EXISTS referral_redemptions_referrer_idx ON public.referral_redemptions (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referral_redemptions_referred_idx ON public.referral_redemptions (referred_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS referral_redemptions_device_hash_key
  ON public.referral_redemptions (device_hash)
  WHERE device_hash IS NOT NULL;

-- Unique constraint for referred_id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referral_redemptions_referred_unique'
  ) THEN
    ALTER TABLE public.referral_redemptions
      ADD CONSTRAINT referral_redemptions_referred_unique UNIQUE (referred_id);
  END IF;
END;
$$;

-- Enable RLS
ALTER TABLE IF EXISTS public.referral_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies for referral_redemptions (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_redemptions' AND policyname = 'referral_redemptions_party_select'
  ) THEN
    CREATE POLICY "referral_redemptions_party_select"
      ON public.referral_redemptions
      FOR SELECT
      USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_redemptions' AND policyname = 'referral_redemptions_self_insert'
  ) THEN
    CREATE POLICY "referral_redemptions_self_insert"
      ON public.referral_redemptions
      FOR INSERT
      WITH CHECK (auth.uid() = referred_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_redemptions' AND policyname = 'referral_redemptions_self_update'
  ) THEN
    CREATE POLICY "referral_redemptions_self_update"
      ON public.referral_redemptions
      FOR UPDATE
      USING (auth.uid() = referrer_id OR auth.uid() = referred_id)
      WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);
  END IF;
END;
$$;

-- Create referral_credit_balances table if not exists
CREATE TABLE IF NOT EXISTS public.referral_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE IF EXISTS public.referral_credit_balances ENABLE ROW LEVEL SECURITY;

-- Policy for referral_credit_balances (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_credit_balances' AND policyname = 'referral_credit_balances_self'
  ) THEN
    CREATE POLICY "referral_credit_balances_self"
      ON public.referral_credit_balances
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Create referral_credit_events table if not exists
CREATE TABLE IF NOT EXISTS public.referral_credit_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  balance_after integer NOT NULL,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for referral_credit_events
CREATE INDEX IF NOT EXISTS referral_credit_events_user_idx ON public.referral_credit_events (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE IF EXISTS public.referral_credit_events ENABLE ROW LEVEL SECURITY;

-- Policy for referral_credit_events (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_credit_events' AND policyname = 'referral_credit_events_self'
  ) THEN
    CREATE POLICY "referral_credit_events_self"
      ON public.referral_credit_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;