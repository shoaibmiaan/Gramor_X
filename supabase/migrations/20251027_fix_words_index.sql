-- Create a lower() index on the actual text column of public.words.
-- Supports common names: word, term, lemma, text; otherwise first text/varchar col.

DO $$
DECLARE
  base_col text;
BEGIN
  -- prefer specific names
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='words' AND column_name='word') THEN
    base_col := 'word';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='words' AND column_name='term') THEN
    base_col := 'term';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='words' AND column_name='lemma') THEN
    base_col := 'lemma';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='words' AND column_name='text') THEN
    base_col := 'text';
  ELSE
    -- fallback: first text-like column
    SELECT column_name
      INTO base_col
      FROM information_schema.columns
     WHERE table_schema='public' AND table_name='words'
       AND data_type IN ('text','character varying')
     ORDER BY ordinal_position
     LIMIT 1;
  END IF;

  IF base_col IS NULL THEN
    RAISE EXCEPTION 'public.words has no text/varchar column to index';
  END IF;

  -- Create index name based on the chosen column; idempotent
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS words_%I_lower_idx ON public.words (lower(%I))',
    base_col, base_col
  );
END$$;
