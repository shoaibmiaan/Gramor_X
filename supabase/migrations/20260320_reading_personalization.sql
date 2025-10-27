-- 20260320_reading_personalization.sql
-- Adds AI explanation cache and per-question difficulty metadata for reading.

create table if not exists public.reading_explanations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.reading_responses(id) on delete cascade,
  section text not null,
  summary text not null,
  focus text,
  reasons jsonb not null,
  model text,
  tokens integer,
  raw jsonb,
  generated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists reading_explanations_attempt_section_idx
  on public.reading_explanations (attempt_id, section);

alter table if exists public.reading_explanations enable row level security;

create policy if not exists "Students manage own reading_explanations"
  on public.reading_explanations
  for all
  using (
    exists (
      select 1
      from public.reading_responses r
      where r.id = attempt_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.reading_responses r
      where r.id = attempt_id and r.user_id = auth.uid()
    )
  );

create policy if not exists "Teachers read reading_explanations"
  on public.reading_explanations
  for select
  using (
    auth.jwt() ->> 'role' in ('teacher', 'admin')
  );

create policy if not exists "Admins manage reading_explanations"
  on public.reading_explanations
  for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

create table if not exists public.reading_items (
  question_id uuid primary key references public.reading_questions(id) on delete cascade,
  difficulty text not null default 'med' check (difficulty in ('easy', 'med', 'hard')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
  before update on public.reading_items
  for each row
  execute procedure public.set_updated_at();

create index if not exists reading_items_difficulty_idx
  on public.reading_items (difficulty);

alter table if exists public.reading_items enable row level security;

create policy if not exists "Public read reading_items"
  on public.reading_items
  for select
  using (true);

create policy if not exists "Admins manage reading_items"
  on public.reading_items
  for all
  using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');
