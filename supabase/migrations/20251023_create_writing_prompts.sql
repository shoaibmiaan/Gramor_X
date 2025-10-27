-- 20251023_create_writing_prompts.sql
-- Ensure the writing_prompts table includes the metadata fields required by the
-- IELTS mock writing module. Older deployments may already have a simplified
-- table, so we defensively add columns when missing.

create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  prompt_text text not null,
  task_type text check (task_type in ('task1','task2')),
  module text check (module in ('academic','general_training')),
  difficulty text check (difficulty in ('easy','medium','hard')),
  source text,
  tags text[] default array[]::text[],
  estimated_minutes integer,
  word_target integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

alter table if exists public.writing_prompts
  add column if not exists slug text;

alter table if exists public.writing_prompts
  add column if not exists task_type text;

alter table if exists public.writing_prompts
  add column if not exists module text;

alter table if exists public.writing_prompts
  add column if not exists difficulty text;

alter table if exists public.writing_prompts
  add column if not exists source text;

alter table if exists public.writing_prompts
  add column if not exists tags text[] default array[]::text[];

alter table if exists public.writing_prompts
  add column if not exists estimated_minutes integer;

alter table if exists public.writing_prompts
  add column if not exists word_target integer;

alter table if exists public.writing_prompts
  add column if not exists metadata jsonb default '{}'::jsonb;

create trigger if not exists writing_prompts_set_updated
  before update on public.writing_prompts
  for each row execute procedure public.set_updated_at();

comment on table public.writing_prompts is 'Master prompt library for IELTS Writing mock exams.';
comment on column public.writing_prompts.slug is 'Stable identifier used by the client to load prompts.';
comment on column public.writing_prompts.module is 'academic or general_training';
comment on column public.writing_prompts.word_target is 'Recommended minimum word count for the prompt.';
comment on column public.writing_prompts.metadata is 'Extra prompt metadata used by curriculum/admin tools.';

do $$ begin
  alter table public.writing_prompts
    add constraint writing_prompts_task_type_check
    check (task_type in ('task1','task2'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.writing_prompts
    add constraint writing_prompts_module_check
    check (module in ('academic','general_training'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.writing_prompts
    add constraint writing_prompts_difficulty_check
    check (difficulty in ('easy','medium','hard'));
exception when duplicate_object then null;
end $$;

create index if not exists writing_prompts_slug_idx on public.writing_prompts(slug);
