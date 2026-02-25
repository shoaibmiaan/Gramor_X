-- 20251011_word_learning.sql (hardened & idempotent)
-- Creates/repairs `public.words` and builds a robust lowercase index.

-- Ensure pgcrypto (for gen_random_uuid on older stacks)
create extension if not exists pgcrypto with schema public;

-- 1) Create table if missing (minimal columns)
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 2) Ensure there is a text column to index; prefer `word`
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'words'
      and column_name  = 'word'
  ) then
    alter table public.words add column word text;
  end if;
exception when undefined_table then
  raise exception 'Table public.words does not exist (unexpected)';
end$$;

-- 3) Create the lower() index safely, even if it existed with a different column earlier
do $$
declare
  idx_exists boolean;
begin
  -- If an index with this name already exists on another column, drop & recreate safely
  select exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'words_word_lower_idx'
  ) into idx_exists;

  if idx_exists then
    -- Verify it targets lower(word); if not, recreate
    perform 1
    from pg_indexes
    where schemaname = 'public'
      and indexname  = 'words_word_lower_idx'
      and indexdef like '%lower((word))%';

    if not found then
      execute 'drop index if exists public.words_word_lower_idx';
      execute 'create index if not exists words_word_lower_idx on public.words (lower(word))';
    end if;
  else
    execute 'create index if not exists words_word_lower_idx on public.words (lower(word))';
  end if;
end$$;
