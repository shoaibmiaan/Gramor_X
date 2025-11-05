-- migrations/0004_migrate_mistakes_book.sql
-- Idempotent migration to ensure mistakes_book has the schema used by the new endpoints.

-- 1) Create table if it doesn't exist (target schema).
CREATE TABLE IF NOT EXISTS public.mistakes_book (
  id uuid PRIMARY KEY,
  user_id uuid,
  mistake text,
  correction text,
  type text,
  retry_path text,
  tags text[],
  resolved boolean DEFAULT false,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2) Add missing columns (safe to run repeatedly).
ALTER TABLE public.mistakes_book
  ADD COLUMN IF NOT EXISTS mistake text,
  ADD COLUMN IF NOT EXISTS correction text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS retry_path text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 3) If older schema used `excerpt`, migrate its data to `mistake` if `mistake` is empty.
DO $$
BEGIN
  -- Only run copy if column excerpt exists and mistake is empty for some rows.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mistakes_book'
      AND column_name = 'excerpt'
  ) THEN
    -- Copy excerpt -> mistake only for rows where mistake IS NULL AND excerpt IS NOT NULL
    EXECUTE $copy$
      UPDATE public.mistakes_book
      SET mistake = excerpt
      WHERE (mistake IS NULL OR trim(mistake) = '')
        AND (excerpt IS NOT NULL AND trim(excerpt) <> '');
    $copy$;
  END IF;
END
$$;


-- 4) Ensure ID values exist (only add defaults where id is NULL) -- optional:
-- If you want, you can set server-side default gen_random_uuid() for new rows (Supabase Postgres has pgcrypto).
-- Add default only if extension exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgcrypto') THEN
    -- set default for future inserts
    ALTER TABLE public.mistakes_book
      ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
EXCEPTION WHEN others THEN
  -- ignore errors (e.g. extension not available)
  RAISE NOTICE 'could not set gen_random_uuid() default for mistakes_book.id';
END;
$$;


-- 5) Indexes: user_id and retry_path, and GIN for tags
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes_book (user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_retry_path ON public.mistakes_book (retry_path);
CREATE INDEX IF NOT EXISTS idx_mistakes_last_seen on public.mistakes_book (last_seen_at);

-- GIN index for text[] tags (good for containment/search)
CREATE INDEX IF NOT EXISTS idx_mistakes_tags_gin ON public.mistakes_book USING GIN (tags);

-- 6) Optional: keep a simple constraint to avoid duplicate retry_path per user
-- This is commented out — enable it if your product logic requires uniqueness.
-- ALTER TABLE public.mistakes_book
--   ADD CONSTRAINT uniq_user_retrypath UNIQUE (user_id, retry_path);

-- Done.
