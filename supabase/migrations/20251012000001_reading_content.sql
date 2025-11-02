-- 20251012000001_reading_content_safe.sql
-- Safe, idempotent reading content schema migration

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create reading_tests table if not exists
CREATE TABLE IF NOT EXISTS public.reading_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  passage_text text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Academic',
  words integer,
  duration_minutes integer,
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for reading_tests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp' AND tgrelid = 'public.reading_tests'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.reading_tests
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Create reading_questions table if not exists
CREATE TABLE IF NOT EXISTS public.reading_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_slug text NOT NULL REFERENCES public.reading_tests(slug) ON DELETE CASCADE,
  order_no integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('tfng','mcq','short','matching')),
  prompt text NOT NULL,
  options jsonb,
  answers jsonb NOT NULL,
  points integer DEFAULT 1,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_questions_order_unique UNIQUE (passage_slug, order_no)
);

-- Trigger for reading_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp' AND tgrelid = 'public.reading_questions'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.reading_questions
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Index for reading_questions
CREATE INDEX IF NOT EXISTS reading_questions_passage_slug_idx
  ON public.reading_questions (passage_slug);

-- Create reading_responses table if not exists
CREATE TABLE IF NOT EXISTS public.reading_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_slug text NOT NULL REFERENCES public.reading_tests(slug) ON DELETE CASCADE,
  answers jsonb,
  score integer,
  total_questions integer,
  accuracy numeric(5,2),
  band numeric(2,1),
  duration_ms integer,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for reading_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp' AND tgrelid = 'public.reading_responses'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.reading_responses
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Indexes for reading_responses
CREATE INDEX IF NOT EXISTS reading_responses_test_slug_idx
  ON public.reading_responses (test_slug);

CREATE INDEX IF NOT EXISTS reading_responses_user_idx
  ON public.reading_responses (user_id);

-- Convenience view to match legacy queries expecting reading_passages
CREATE OR REPLACE VIEW public.reading_passages AS
SELECT
  id,
  slug,
  title,
  passage_text AS content,
  difficulty,
  words,
  duration_minutes,
  published,
  created_by,
  created_at,
  updated_at
FROM public.reading_tests;

ALTER VIEW IF EXISTS public.reading_passages SET (security_invoker = true);

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.reading_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reading_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reading_responses ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_tests' AND policyname = 'Public read reading_tests'
  ) THEN
    CREATE POLICY "Public read reading_tests"
      ON public.reading_tests
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_questions' AND policyname = 'Public read reading_questions'
  ) THEN
    CREATE POLICY "Public read reading_questions"
      ON public.reading_questions
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_tests' AND policyname = 'Teachers manage reading tests'
  ) THEN
    CREATE POLICY "Teachers manage reading tests"
      ON public.reading_tests
      FOR ALL
      USING (auth.jwt()->>'role' IN ('teacher','admin'))
      WITH CHECK (auth.jwt()->>'role' IN ('teacher','admin'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_questions' AND policyname = 'Teachers manage reading questions'
  ) THEN
    CREATE POLICY "Teachers manage reading questions"
      ON public.reading_questions
      FOR ALL
      USING (auth.jwt()->>'role' IN ('teacher','admin'))
      WITH CHECK (auth.jwt()->>'role' IN ('teacher','admin'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_responses' AND policyname = 'Students manage own reading_responses'
  ) THEN
    CREATE POLICY "Students manage own reading_responses"
      ON public.reading_responses
      FOR ALL
      USING (auth.uid() = user_id AND auth.jwt()->>'role' IN ('student','teacher'))
      WITH CHECK (auth.uid() = user_id AND auth.jwt()->>'role' IN ('student','teacher'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_responses' AND policyname = 'Teachers read reading_responses'
  ) THEN
    CREATE POLICY "Teachers read reading_responses"
      ON public.reading_responses
      FOR SELECT
      USING (auth.jwt()->>'role' IN ('teacher','admin'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reading_responses' AND policyname = 'Admins manage reading_responses'
  ) THEN
    CREATE POLICY "Admins manage reading_responses"
      ON public.reading_responses
      FOR ALL
      USING (auth.jwt()->>'role' = 'admin')
      WITH CHECK (auth.jwt()->>'role' = 'admin');
  END IF;
END;
$$;