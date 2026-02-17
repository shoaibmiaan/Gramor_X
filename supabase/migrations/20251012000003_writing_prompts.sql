-- 20251012000003_writing_prompts_safe.sql
-- Safe, idempotent writing prompts and responses schema migration

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

-- Create writing_prompts table if not exists
CREATE TABLE IF NOT EXISTS public.writing_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  prompt_text text NOT NULL,
  prompt_type text,
  sample_answer text,
  rubric_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for writing_prompts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp' AND tgrelid = 'public.writing_prompts'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.writing_prompts
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Create writing_responses table if not exists
CREATE TABLE IF NOT EXISTS public.writing_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.writing_prompts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  word_count integer,
  overall_score numeric(3,1),
  task_response_score numeric(3,1),
  coherence_score numeric(3,1),
  lexical_score numeric(3,1),
  grammar_score numeric(3,1),
  feedback jsonb,
  submitted_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for writing_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_timestamp' AND tgrelid = 'public.writing_responses'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.writing_responses
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.writing_responses ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'writing_prompts' AND policyname = 'Public read writing_prompts'
  ) THEN
    CREATE POLICY "Public read writing_prompts"
      ON public.writing_prompts
      FOR SELECT
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'writing_prompts' AND policyname = 'Teachers manage writing_prompts'
  ) THEN
    CREATE POLICY "Teachers manage writing_prompts"
      ON public.writing_prompts
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
    WHERE schemaname = 'public' AND tablename = 'writing_responses' AND policyname = 'Students manage own writing_responses'
  ) THEN
    CREATE POLICY "Students manage own writing_responses"
      ON public.writing_responses
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
    WHERE schemaname = 'public' AND tablename = 'writing_responses' AND policyname = 'Teachers manage writing_responses'
  ) THEN
    CREATE POLICY "Teachers manage writing_responses"
      ON public.writing_responses
      FOR ALL
      USING (auth.jwt()->>'role' IN ('teacher','admin'))
      WITH CHECK (auth.jwt()->>'role' IN ('teacher','admin'));
  END IF;
END;
$$;