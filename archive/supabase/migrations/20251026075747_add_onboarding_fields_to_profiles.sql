-- 20251026075805_add_onboarding_fields_to_profiles_safe.sql
-- Safe addition of onboarding fields to profiles (assuming based on context; file was empty)

-- Ensure table exists minimally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add onboarding fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS onboarding_step smallint DEFAULT 0,
      ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;
  END IF;
END;
$$ LANGUAGE plpgsql;