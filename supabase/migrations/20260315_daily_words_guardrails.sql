-- Issue 1: Daily Words guardrails for one-row-per-day safety
-- Clean up any duplicate or invalid rows before adding constraints
with duplicates as (
  select ctid
  from (
    select ctid,
           row_number() over (partition by word_date order by ctid) as rn
    from public.daily_words
    where word_date is not null
  ) ranked
  where ranked.rn > 1
)
delete from public.daily_words d
using duplicates dup
where d.ctid = dup.ctid;

-- Remove any rows missing required references
delete from public.daily_words
where word_date is null;

delete from public.daily_words
where vocab_word_id is null;

-- Enforce not-null requirements prior to constraints
alter table if exists public.daily_words
  alter column word_date set not null;

alter table if exists public.daily_words
  alter column vocab_word_id set not null;

-- Ensure a single word per day via unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.daily_words'::regclass
      AND conname = 'daily_words_word_date_key'
  ) THEN
    ALTER TABLE public.daily_words
      ADD CONSTRAINT daily_words_word_date_key UNIQUE (word_date);
  END IF;
END
$$;

-- Back foreign key with vocab words catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.daily_words'::regclass
      AND conname = 'daily_words_vocab_word_id_fkey'
  ) THEN
    ALTER TABLE public.daily_words
      ADD CONSTRAINT daily_words_vocab_word_id_fkey
        FOREIGN KEY (vocab_word_id)
        REFERENCES public.vocab_words(id);
  END IF;
END
$$;

-- Automatically populate missing dates on insert
create or replace function public.daily_words_set_word_date()
returns trigger
language plpgsql
as $$
begin
  if new.word_date is null then
    new.word_date := current_date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_daily_words_set_word_date on public.daily_words;
create trigger trg_daily_words_set_word_date
before insert on public.daily_words
for each row execute function public.daily_words_set_word_date();
