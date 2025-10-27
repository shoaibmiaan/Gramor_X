-- 20251026_create_writing_topics.sql
-- Admin-managed catalog of writing prompts grouped by difficulty and band target.

set check_function_bodies = off;

create table if not exists public.writing_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  band_target numeric(3,1) not null check (band_target between 4.0 and 9.0),
  tags text[] not null default '{}'::text[],
  difficulty text not null check (difficulty in ('starter','intermediate','advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists writing_topics_band_idx on public.writing_topics(band_target);
create index if not exists writing_topics_difficulty_idx on public.writing_topics(difficulty);
create index if not exists writing_topics_tags_gin on public.writing_topics using gin(tags);

create trigger if not exists writing_topics_set_updated
  before update on public.writing_topics
  for each row execute procedure public.set_updated_at();

alter table if exists public.writing_topics enable row level security;

create policy "admins manage writing topics"
  on public.writing_topics
  for all
  to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

comment on table public.writing_topics is 'Admin curated IELTS writing prompts with band targets and tags.';
comment on column public.writing_topics.prompt is 'Full question text shown to learners.';

