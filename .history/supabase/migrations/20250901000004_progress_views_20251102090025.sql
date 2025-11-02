-- supabase/migrations/20250901_progress_views.sql
-- views for user progress analytics

-- Band trajectory across skills
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'reading_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'listening_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'writing_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'speaking_attempts' AND n.nspname = 'public')
  THEN
    CREATE OR REPLACE VIEW public.progress_band_trajectory AS
    SELECT user_id, 'reading' AS skill, band, created_at AS attempt_date
      FROM public.reading_attempts
    UNION ALL
    SELECT user_id, 'listening' AS skill, band, submitted_at AS attempt_date
      FROM public.listening_attempts
    UNION ALL
    SELECT user_id, 'writing' AS skill, band, created_at AS attempt_date
      FROM public.writing_attempts
    UNION ALL
    SELECT user_id, 'speaking' AS skill, overall AS band, created_at AS attempt_date
      FROM public.speaking_attempts;
  END IF;
END
$$;

-- Accuracy by question type (reading + listening)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'reading_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'listening_attempts' AND n.nspname = 'public')
  THEN
    CREATE OR REPLACE VIEW public.progress_accuracy_per_type AS
    WITH answers AS (
      SELECT user_id, jsonb_array_elements(answers_json) AS ans
      FROM public.reading_attempts
      UNION ALL
      SELECT user_id, jsonb_array_elements(answers_json) AS ans
      FROM public.listening_attempts
    )
    SELECT user_id,
           coalesce(ans->>'type','unknown') AS question_type,
           avg((ans->>'correct')::int * 100) AS accuracy_pct
    FROM answers
    WHERE ans ? 'correct'
    GROUP BY user_id, question_type;
  END IF;
END
$$;

-- Total time spent per skill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'reading_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'listening_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'writing_attempts' AND n.nspname = 'public')
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'speaking_attempts' AND n.nspname = 'public')
  THEN
    CREATE OR REPLACE VIEW public.progress_time_spent AS
    SELECT user_id, 'reading' AS skill, sum(coalesce(duration_ms,0))/60000 AS total_minutes
      FROM public.reading_attempts GROUP BY user_id
    UNION ALL
    SELECT user_id, 'listening' AS skill, sum(coalesce((meta->>'duration_sec')::int,0))/60 AS total_minutes
      FROM public.listening_attempts GROUP BY user_id
    UNION ALL
    SELECT user_id, 'writing' AS skill, sum(coalesce(duration_ms,0))/60000 AS total_minutes
      FROM public.writing_attempts GROUP BY user_id
    UNION ALL
    SELECT user_id, 'speaking' AS skill, sum(coalesce(duration_sec,0))/60 AS total_minutes
      FROM public.speaking_attempts GROUP BY user_id;
  END IF;
END
$$;
