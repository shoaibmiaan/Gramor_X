-- Add subscription_tier enum and profile column (idempotent + safe backfill)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_tier' AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.subscription_tier AS ENUM ('free', 'seedling', 'rocket', 'owl');
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS tier public.subscription_tier DEFAULT 'free';

-- Only update if the table actually exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'profiles' AND n.nspname = 'public'
  ) THEN
    UPDATE public.profiles
    SET tier = 'free'
    WHERE tier IS NULL;
  END IF;
END
$$;

ALTER TABLE IF EXISTS public.profiles
  ALTER COLUMN tier SET NOT NULL;

-- (Future) RLS/tier gates go in later migrations when content tables exist.
