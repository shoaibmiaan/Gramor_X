-- 20251010000001_add_onboarding_progress_safe.sql
-- Safe, idempotent onboarding columns migration

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Try to alter public.profiles if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS onboarding_step smallint DEFAULT 0,
      ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS study_days text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS study_minutes_per_day integer;

    -- Repair NULLs if any
    UPDATE public.profiles 
    SET study_days = '{}'::text[] 
    WHERE study_days IS NULL;
    
    -- Set default for preferred_language if NULL
    UPDATE public.profiles 
    SET preferred_language = 'en' 
    WHERE preferred_language IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2) If profiles missing but user_profiles exists, apply same changes there
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD COLUMN IF NOT EXISTS onboarding_step smallint DEFAULT 0,
      ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS study_days text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS study_minutes_per_day integer;

    -- Repair NULLs if any
    UPDATE public.user_profiles 
    SET study_days = '{}'::text[] 
    WHERE study_days IS NULL;
    
    -- Set default for preferred_language if NULL
    UPDATE public.user_profiles 
    SET preferred_language = 'en' 
    WHERE preferred_language IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3) If neither table exists, create a minimal fallback public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      onboarding_step smallint DEFAULT 0,
      onboarding_complete boolean DEFAULT false,
      whatsapp_opt_in boolean DEFAULT false,
      preferred_language text DEFAULT 'en',
      study_days text[] DEFAULT '{}'::text[],
      study_minutes_per_day integer
    );

    -- Optional: Add a trigger for updated_at if needed
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE
      ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
  END IF;
END;
$$ LANGUAGE plpgsql;