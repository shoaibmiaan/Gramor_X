-- Ensure reading_tests.slug exists, is unique, and (if possible) NOT NULL.
DO $$
DECLARE
  has_title boolean;
BEGIN
  IF to_regclass('public.reading_tests') IS NULL THEN
    RAISE NOTICE 'Table public.reading_tests not found; nothing to do.';
    RETURN;
  END IF;

  -- 0) Detect if title column exists (so we can backfill nicely)
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reading_tests'
      AND column_name  = 'title'
  ) INTO has_title;

  -- 1) Add slug column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'reading_tests'
      AND column_name  = 'slug'
  ) THEN
    ALTER TABLE public.reading_tests ADD COLUMN slug text;
  END IF;

  -- 2) Backfill empty slugs
  IF has_title THEN
    -- Use title → kebab-case; fallback to id hash
    EXECUTE $g$
      UPDATE public.reading_tests AS t
         SET slug = CASE
                      WHEN t.slug IS NULL OR t.slug = '' THEN
                        COALESCE(
                          NULLIF(
                            trim(both '-' FROM regexp_replace(lower(t.title), '[^a-z0-9]+', '-', 'g')),
                            ''
                          ),
                          'rt-' || substr(md5(t.id::text), 1, 8)
                        )
                      ELSE t.slug
                    END
       WHERE t.slug IS NULL OR t.slug = '';
    $g$;
  ELSE
    -- No title column; use id-based slug
    EXECUTE $h$
      UPDATE public.reading_tests AS t
         SET slug = CASE
                      WHEN t.slug IS NULL OR t.slug = '' THEN
                        'rt-' || substr(md5(t.id::text), 1, 8)
                      ELSE t.slug
                    END
       WHERE t.slug IS NULL OR t.slug = '';
    $h$;
  END IF;

  -- 3) De-duplicate slugs by appending short hash
  EXECUTE $d$
    WITH dupe AS (
      SELECT t.id,
             t.slug,
             row_number() OVER (PARTITION BY t.slug ORDER BY t.id) AS rn
      FROM public.reading_tests t
    )
    UPDATE public.reading_tests AS t
       SET slug = t.slug || '-' || substr(md5(t.id::text), 1, 6)
    FROM dupe d
    WHERE t.id = d.id
      AND d.rn > 1;
  $d$;

  -- 4) Add UNIQUE constraint if absent
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reading_tests_slug_key'
      AND conrelid = 'public.reading_tests'::regclass
  ) THEN
    ALTER TABLE public.reading_tests
      ADD CONSTRAINT reading_tests_slug_key UNIQUE (slug);
  END IF;

  -- 5) Make NOT NULL only if safe
  IF NOT EXISTS (SELECT 1 FROM public.reading_tests WHERE slug IS NULL) THEN
    ALTER TABLE public.reading_tests ALTER COLUMN slug SET NOT NULL;
  ELSE
    RAISE NOTICE 'reading_tests.slug kept NULLABLE due to existing NULLs';
  END IF;
END$$;
