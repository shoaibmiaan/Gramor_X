-- 20251030000001_align_profiles_for_setup_safe.sql
-- Safe alignment of public.profiles with setup flow fields

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

-- Add columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS country text,
      ADD COLUMN IF NOT EXISTS english_level text CHECK (english_level IN (
        'Beginner',
        'Elementary',
        'Pre-Intermediate',
        'Intermediate',
        'Upper-Intermediate',
        'Advanced'
      )),
      ADD COLUMN IF NOT EXISTS goal_band numeric(2,1),
      ADD COLUMN IF NOT EXISTS exam_date date,
      ADD COLUMN IF NOT EXISTS study_prefs text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS time_commitment text CHECK (time_commitment IN ('1h/day','2h/day','Flexible')),
      ADD COLUMN IF NOT EXISTS time_commitment_min integer,
      ADD COLUMN IF NOT EXISTS days_per_week smallint CHECK (days_per_week BETWEEN 1 AND 7),
      ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS language_preference text DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS avatar_url text,
      ADD COLUMN IF NOT EXISTS goal_reason text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS learning_style text,
      ADD COLUMN IF NOT EXISTS ai_recommendation jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS setup_complete boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'inactive',
      ADD COLUMN IF NOT EXISTS role text DEFAULT 'student',
      ADD COLUMN IF NOT EXISTS timezone text,
      ADD COLUMN IF NOT EXISTS weaknesses text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS focus_topics text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS daily_quota_goal integer,
      ADD COLUMN IF NOT EXISTS study_days text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS study_minutes_per_day integer,
      ADD COLUMN IF NOT EXISTS phone text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update defaults for existing rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    UPDATE public.profiles
    SET
      study_prefs = COALESCE(study_prefs, '{}'::text[]),
      goal_reason = COALESCE(goal_reason, '{}'::text[]),
      weaknesses = COALESCE(weaknesses, '{}'::text[]),
      focus_topics = COALESCE(focus_topics, '{}'::text[]),
      preferred_language = COALESCE(preferred_language, 'en'),
      language_preference = COALESCE(language_preference, preferred_language, 'en'),
      ai_recommendation = COALESCE(ai_recommendation, '{}'::jsonb),
      setup_complete = COALESCE(setup_complete, false),
      status = COALESCE(status, 'inactive'),
      role = COALESCE(role, 'student');
  END IF;
END;
$$ LANGUAGE plpgsql;