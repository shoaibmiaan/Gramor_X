-- Listening content schema (adds safe trigger function + RLS + policies)

-- Ensure updated_at trigger function exists
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tests
create table if not exists public.listening_tests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  audio_url text not null,
  transcript text,
  level text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timestamp on public.listening_tests;
create trigger set_timestamp
  before update on public.listening_tests
  for each row
  execute procedure public.set_updated_at();

-- Sections
create table if not exists public.listening_sections (
  id uuid primary key default gen_random_uuid(),
  test_slug text not null references public.listening_tests(slug) on delete cascade,
  order_no integer not null,
  start_ms integer not null,
  end_ms integer not null,
  transcript text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_sections_order_unique unique (test_slug, order_no)
);

drop trigger if exists set_timestamp on public.listening_sections;
create trigger set_timestamp
  before update on public.listening_sections
  for each row
  execute procedure public.set_updated_at();

-- Questions
create table if not exists public.listening_questions (
  id uuid primary key default gen_random_uuid(),
  test_slug text not null references public.listening_tests(slug) on delete cascade,
  qno integer not null,
  type text not null check (type in ('mcq', 'gap', 'match')),
  prompt text not null,
  options jsonb,
  answer_key jsonb,
  match_left jsonb,
  match_right jsonb,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listening_questions_qno_unique unique (test_slug, qno)
);

drop trigger if exists set_timestamp on public.listening_questions;
create trigger set_timestamp
  before update on public.listening_questions
  for each row
  execute procedure public.set_updated_at();

-- Responses
create table if not exists public.listening_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_slug text not null references public.listening_tests(slug) on delete cascade,
  score integer,
  total_questions integer,
  accuracy numeric(5,2),
  band numeric(2,1),
  meta jsonb,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_timestamp on public.listening_responses;
create trigger set_timestamp
  before update on public.listening_responses
  for each row
  execute procedure public.set_updated_at();

-- RLS enable
alter table if exists public.listening_tests enable row level security;
alter table if exists public.listening_sections enable row level security;
alter table if exists public.listening_questions enable row level security;
alter table if exists public.listening_responses enable row level security;

-- Policies
do $$
begin
  create policy "Public read listening_tests"
    on public.listening_tests for select using (true);
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Public read listening_sections"
    on public.listening_sections for select using (true);
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Public read listening_questions"
    on public.listening_questions for select using (true);
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Students manage own listening_responses"
    on public.listening_responses
    for all to authenticated
    using (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'))
    with check (auth.uid() = user_id and auth.jwt()->>'role' in ('student','teacher'));
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Admins manage listening_responses"
    on public.listening_responses
    for all to authenticated
    using (auth.jwt()->>'role' = 'admin')
    with check (auth.jwt()->>'role' = 'admin');
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Teachers manage listening content"
    on public.listening_tests
    for all to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Teachers manage listening sections"
    on public.listening_sections
    for all to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null; end$$;

do $$
begin
  create policy "Teachers manage listening questions"
    on public.listening_questions
    for all to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null; end$$;
