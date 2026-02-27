-- 20251020000002_vocab_srs_schema_safe.sql
-- Safe, idempotent Phase 1 vocabulary SRS data model migration

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create minimal public.words table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    CREATE TABLE public.words (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      word text NOT NULL,
      meaning text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Trigger for words
    CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON public.words
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add new descriptive columns to public.words if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    ALTER TABLE public.words
      ADD COLUMN IF NOT EXISTS headword text,
      ADD COLUMN IF NOT EXISTS pos text,
      ADD COLUMN IF NOT EXISTS definition text,
      ADD COLUMN IF NOT EXISTS freq_rank integer,
      ADD COLUMN IF NOT EXISTS ielts_topics text[] DEFAULT '{}'::text[],
      ADD COLUMN IF NOT EXISTS register text,
      ADD COLUMN IF NOT EXISTS cefr text;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update headword and definition from legacy columns if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    UPDATE public.words
    SET headword = COALESCE(headword, word),
        definition = COALESCE(definition, meaning);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Normalize register and cefr if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    UPDATE public.words
    SET register = LOWER(register)
    WHERE register IS NOT NULL;

    UPDATE public.words
    SET cefr = UPPER(cefr)
    WHERE cefr IS NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Set not null constraints if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    ALTER TABLE public.words
      ALTER COLUMN headword SET NOT NULL,
      ALTER COLUMN definition SET NOT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS words_headword_lower_idx
  ON public.words (LOWER(headword));

-- Add register constraint if table and constraint do not exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'words_register_check' AND conrelid = 'public.words'::regclass
  ) THEN
    ALTER TABLE public.words
      ADD CONSTRAINT words_register_check
        CHECK (register IS NULL OR register IN ('formal','neutral'));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add cefr constraint if table and constraint do not exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'words_cefr_check' AND conrelid = 'public.words'::regclass
  ) THEN
    ALTER TABLE public.words
      ADD CONSTRAINT words_cefr_check
        CHECK (cefr IS NULL OR cefr IN ('B1','B2','C1'));
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create or replace sync function
CREATE OR REPLACE FUNCTION public.words_sync_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.headword IS NULL AND NEW.word IS NOT NULL THEN
    NEW.headword := NEW.word;
  ELSIF NEW.word IS NULL AND NEW.headword IS NOT NULL THEN
    NEW.word := NEW.headword;
  END IF;

  IF NEW.definition IS NULL AND NEW.meaning IS NOT NULL THEN
    NEW.definition := NEW.meaning;
  ELSIF NEW.meaning IS NULL AND NEW.definition IS NOT NULL THEN
    NEW.meaning := NEW.definition;
  END IF;

  IF NEW.register IS NOT NULL THEN
    NEW.register := LOWER(NEW.register);
  END IF;

  IF NEW.cefr IS NOT NULL THEN
    NEW.cefr := UPPER(NEW.cefr);
  END IF;

  RETURN NEW;
END;
$$;

-- Manage trigger on words
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'words'
  ) THEN
    DROP TRIGGER IF EXISTS trg_words_sync_columns ON public.words;
    CREATE TRIGGER trg_words_sync_columns
      BEFORE INSERT OR UPDATE ON public.words
      FOR EACH ROW EXECUTE PROCEDURE public.words_sync_columns();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create word_examples table if not exists
CREATE TABLE IF NOT EXISTS public.word_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  text text NOT NULL,
  source text NOT NULL CHECK (source IN ('ielts_reading','crafted')),
  is_gap_ready boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for word_examples
CREATE INDEX IF NOT EXISTS word_examples_word_idx ON public.word_examples (word_id);

-- Trigger for word_examples
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_word_examples_updated ON public.word_examples;
  CREATE TRIGGER trg_word_examples_updated
    BEFORE UPDATE ON public.word_examples
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create word_collocations table if not exists
CREATE TABLE IF NOT EXISTS public.word_collocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  chunk text NOT NULL,
  pattern text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for word_collocations
CREATE INDEX IF NOT EXISTS word_collocations_word_idx ON public.word_collocations (word_id);

-- Trigger for word_collocations
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_word_collocations_updated ON public.word_collocations;
  CREATE TRIGGER trg_word_collocations_updated
    BEFORE UPDATE ON public.word_collocations
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create word_audio table if not exists
CREATE TABLE IF NOT EXISTS public.word_audio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  ipa text,
  audio_url jsonb DEFAULT '{}'::jsonb,
  tts_provider text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique index for word_audio
CREATE UNIQUE INDEX IF NOT EXISTS word_audio_word_idx ON public.word_audio (word_id);

-- Trigger for word_audio
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_word_audio_updated ON public.word_audio;
  CREATE TRIGGER trg_word_audio_updated
    BEFORE UPDATE ON public.word_audio
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create user_word_stats table if not exists
CREATE TABLE IF NOT EXISTS public.user_word_stats (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('new','learning','mastered','suspended')),
  ef double precision NOT NULL DEFAULT 2.3,
  streak_correct integer NOT NULL DEFAULT 0,
  last_result text CHECK (last_result IN ('pass','fail')),
  last_seen_at timestamptz,
  next_due_at timestamptz,
  interval_days integer NOT NULL DEFAULT 0,
  ease smallint NOT NULL DEFAULT 2 CHECK (ease BETWEEN 1 AND 4),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_word_stats_pkey PRIMARY KEY (user_id, word_id)
);

-- Index for user_word_stats
CREATE INDEX IF NOT EXISTS user_word_stats_due_idx
  ON public.user_word_stats (user_id, next_due_at);

-- Trigger for user_word_stats
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_user_word_stats_updated ON public.user_word_stats;
  CREATE TRIGGER trg_user_word_stats_updated
    BEFORE UPDATE ON public.user_word_stats
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create review_queue table if not exists
CREATE TABLE IF NOT EXISTS public.review_queue (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('word','collocation','gap')),
  item_ref_id uuid NOT NULL,
  due_at timestamptz NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT review_queue_pkey PRIMARY KEY (user_id, item_type, item_ref_id)
);

-- Index for review_queue
CREATE INDEX IF NOT EXISTS review_queue_due_idx
  ON public.review_queue (user_id, due_at, priority DESC);

-- Trigger for review_queue
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_review_queue_updated ON public.review_queue;
  CREATE TRIGGER trg_review_queue_updated
    BEFORE UPDATE ON public.review_queue
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create badges table if not exists
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for badges
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_badges_updated ON public.badges;
  CREATE TRIGGER trg_badges_updated
    BEFORE UPDATE ON public.badges
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Create user_badges table if not exists
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_badges_pkey PRIMARY KEY (user_id, badge_id)
);

-- Create leaderboards_daily table if not exists
CREATE TABLE IF NOT EXISTS public.leaderboards_daily (
  id bigserial PRIMARY KEY,
  snapshot_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  score integer NOT NULL,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Unique index for leaderboards_daily
CREATE UNIQUE INDEX IF NOT EXISTS leaderboards_daily_unique
  ON public.leaderboards_daily (snapshot_date, user_id);

-- Create user_prefs table if not exists
CREATE TABLE IF NOT EXISTS public.user_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_skill text[] DEFAULT '{}'::text[],
  target_band numeric(2,1),
  daily_quota_words integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for user_prefs
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_user_prefs_updated ON public.user_prefs;
  CREATE TRIGGER trg_user_prefs_updated
    BEFORE UPDATE ON public.user_prefs
    FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
END;
$$;

-- Enable row level security
ALTER TABLE IF EXISTS public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.word_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.word_collocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.word_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_word_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leaderboards_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_prefs ENABLE ROW LEVEL SECURITY;

-- Public read policies (idempotent)
DO $$
BEGIN
  CREATE POLICY "words_public_read" ON public.words
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_examples_public_read" ON public.word_examples
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_collocations_public_read" ON public.word_collocations
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_audio_public_read" ON public.word_audio
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "badges_public_read" ON public.badges
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

-- Service role write policies (idempotent)
DO $$
BEGIN
  CREATE POLICY "words_service_write" ON public.words
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_examples_service_write" ON public.word_examples
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_collocations_service_write" ON public.word_collocations
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "word_audio_service_write" ON public.word_audio
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "badges_service_write" ON public.badges
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "user_badges_service_write" ON public.user_badges
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "leaderboards_daily_service_write" ON public.leaderboards_daily
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

-- User owned data policies (idempotent)
DO $$
BEGIN
  CREATE POLICY "user_word_stats_self_access" ON public.user_word_stats
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "review_queue_self_access" ON public.review_queue
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "user_badges_self_access" ON public.user_badges
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "user_prefs_self_access" ON public.user_prefs
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;

DO $$
BEGIN
  CREATE POLICY "leaderboards_daily_self_read" ON public.leaderboards_daily
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;