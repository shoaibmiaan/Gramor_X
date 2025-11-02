BEGIN;

-- PROFILES changes (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS preferred_language text,
      ADD COLUMN IF NOT EXISTS study_days text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS study_minutes_per_day integer;

    -- Make sure existing rows have an empty array rather than NULL
    UPDATE public.profiles
      SET study_days = '{}'::text[]
      WHERE study_days IS NULL;
  END IF;
END
$$;

-- USER_PROFILES changes (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS study_days text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS study_minutes_per_day integer,
      ALTER COLUMN IF EXISTS preferred_language SET DEFAULT 'en';

    -- Optional: set NULL study_days -> empty array for user_profiles as well
    UPDATE public.user_profiles
      SET study_days = '{}'::text[]
      WHERE study_days IS NULL;
  END IF;
END
$$;

-- Optional: create a GIN index to speed up array queries on study_da_
