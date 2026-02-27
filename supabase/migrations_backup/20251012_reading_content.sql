-- Reading content schema

create table if not exists public.reading_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text,
  passage_text text not null,
  difficulty text not null default 'Academic',
  words integer,
  duration_minutes integer,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp
  before update on public.reading_tests
  for each row
  execute procedure public.set_updated_at();

create table if not exists public.reading_questions (
  id uuid primary key default gen_random_uuid(),
  passage_slug text not null references public.reading_tests(slug) on delete cascade,
  order_no integer not null,
  kind text not null check (kind in ('tfng','mcq','short','matching')),
  prompt text not null,
  options jsonb,
  answers jsonb not null,
  points integer default 1,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_questions_order_unique unique (passage_slug, order_no)
);

create trigger set_timestamp
  before update on public.reading_questions
  for each row
  execute procedure public.set_updated_at();

create index if not exists reading_questions_passage_slug_idx
  on public.reading_questions (passage_slug);

create table if not exists public.reading_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_slug text not null references public.reading_tests(slug) on delete cascade,
  answers jsonb,
  score integer,
  total_questions integer,
  accuracy numeric(5,2),
  band numeric(2,1),
  duration_ms integer,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_timestamp
  before update on public.reading_responses
  for each row
  execute procedure public.set_updated_at();

create index if not exists reading_responses_test_slug_idx
  on public.reading_responses (test_slug);

create index if not exists reading_responses_user_idx
  on public.reading_responses (user_id);

-- Convenience view to match legacy queries expecting reading_passages
create or replace view public.reading_passages as
select
  id,
  slug,
  title,
  passage_text as content,
  difficulty,
  words,
  duration_minutes,
  published,
  created_by,
  created_at,
  updated_at
from public.reading_tests;

alter view public.reading_passages set (security_invoker = true);

-- Row Level Security
alter table if exists public.reading_tests enable row level security;
alter table if exists public.reading_questions enable row level security;
alter table if exists public.reading_responses enable row level security;

create policy if not exists "Public read reading_tests"
  on public.reading_tests
  for select
  using (true);

create policy if not exists "Public read reading_questions"
  on public.reading_questions
  for select
  using (true);

create policy if not exists "Teachers manage reading tests"
  on public.reading_tests
  for all
  using (auth.jwt()->>'role' in ('teacher','admin'))
  with check (auth.jwt()->>'role' in ('teacher','admin'));

create policy if not exists "Teachers manage reading questions"
  on public.reading_questions
  for all
  using (auth.jwt()->>'role' in ('teacher','admin'))
  with check (auth.jwt()->>'role' in ('teacher','admin'));

create policy if not exists "Students manage own reading_responses"
  on public.reading_responses
  for all
  using (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'))
  with check (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'));

create policy if not exists "Teachers read reading_responses"
  on public.reading_responses
  for select
  using (auth.jwt()->>'role' in ('teacher','admin'));

create policy if not exists "Admins manage reading_responses"
  on public.reading_responses
  for all
  using (auth.jwt()->>'role' = 'admin')
  with check (auth.jwt()->>'role' = 'admin');
