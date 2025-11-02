-- 20251011999999_add_reading_tests_passage_text_safe.sql
-- Safe, idempotent migration to add and backfill reading_tests.passage_text

-- Ensure reading_tests.passage_text exists and is backfilled from content/title/id if available.
DO $$
DECLARE
  has_content boolean;
  has_title   boolean;
BEGIN
  IF to_regclass('public.reading_tests') IS NULL THEN
    RAISE NOTICE 'Table public.reading_tests not found; nothing to do.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reading_tests' AND column_name='content'
  ) INTO has_content;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reading_tests' AND column_name='title'
  ) INTO has_title;

  -- 1) Add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reading_tests' AND column_name='passage_text'
  ) THEN
    ALTER TABLE public.reading_tests ADD COLUMN passage_text text;
  END IF;

  -- 2) Backfill nulls
  IF has_content THEN
    EXECUTE $update$UPDATE public.reading_tests SET passage_text = COALESCE(passage_text, content) WHERE passage_text IS NULL$update$;
  ELSIF has_title THEN
    EXECUTE $update$UPDATE public.reading_tests SET passage_text = COALESCE(passage_text, title) WHERE passage_text IS NULL$update$;
  ELSE
    EXECUTE $update$UPDATE public.reading_tests SET passage_text = COALESCE(passage_text, 'Reading passage') WHERE passage_text IS NULL$update$;
  END IF;
END;
$$ LANGUAGE plpgsql;