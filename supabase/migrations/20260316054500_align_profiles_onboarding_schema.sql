-- Ensure profiles table matches onboarding API expectations.
-- Expected by pages/api/onboarding/index.ts:
--   - profiles.settings (jsonb)
--   - profiles.onboarding_step (int, used for progress)
--   - profiles.onboarding_complete (bool)
--   - profiles.updated_at (version for optimistic concurrency)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS settings jsonb;

ALTER TABLE public.profiles
  ALTER COLUMN settings SET DEFAULT '{}'::jsonb;

UPDATE public.profiles
SET settings = '{}'::jsonb
WHERE settings IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN settings SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step integer;

UPDATE public.profiles
SET onboarding_step = 0
WHERE onboarding_step IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_step SET DEFAULT 0,
  ALTER COLUMN onboarding_step SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean;

UPDATE public.profiles
SET onboarding_complete = false
WHERE onboarding_complete IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN onboarding_complete SET DEFAULT false,
  ALTER COLUMN onboarding_complete SET NOT NULL;


ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.profiles
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_onboarding_step_range_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_onboarding_step_range_check
      CHECK (onboarding_step >= 0 AND onboarding_step <= 12);
  END IF;
END $$;

UPDATE public.profiles
SET settings = jsonb_set(
  settings,
  '{onboarding}',
  COALESCE(settings->'onboarding', '{}'::jsonb),
  true
)
WHERE jsonb_typeof(settings) = 'object'
  AND (settings->'onboarding' IS NULL OR jsonb_typeof(settings->'onboarding') <> 'object');

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_profiles_set_updated_at'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER trg_profiles_set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_profiles_updated_at();
  END IF;
END $$;
