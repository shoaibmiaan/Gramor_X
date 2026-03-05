-- supabase/tables/reading_responses.sql
-- Canonical schema for storing graded reading submissions.

create table if not exists public.reading_responses (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete set null,
  passage_slug text not null,
  correct_count integer not null,
  total_questions integer not null,
  total_points integer not null,
  earned_points integer not null,
  band numeric(3,1) not null,
  duration_ms bigint,
  answers_json jsonb not null,
  result_json jsonb not null,
  meta jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reading_responses_user_idx on public.reading_responses (user_id);
create index if not exists reading_responses_slug_idx on public.reading_responses (passage_slug);

alter table if exists public.reading_responses enable row level security;

create policy if not exists "Students manage own reading responses"
  on public.reading_responses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Admins read all reading responses"
  on public.reading_responses
  for select
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin'));
