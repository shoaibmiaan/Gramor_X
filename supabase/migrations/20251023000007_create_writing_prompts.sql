-- 20251023000007_create_writing_prompts_safe.sql
-- Safe, idempotent writing prompts schema migration

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

-- Trigger for writing_prompts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'writing_prompts_set_updated' AND tgrelid = 'public.writing_prompts'::regclass
  ) THEN
    CREATE TRIGGER writing_prompts_set_updated
      BEFORE UPDATE ON public.writing_prompts
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;