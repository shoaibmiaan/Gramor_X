-- Enable required extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type writing_task_type as enum ('task1','task2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type writing_attempt_status as enum ('draft','submitted','scored');
exception when duplicate_object then null; end $$;

do $$ begin
  create type writing_review_role as enum ('peer','teacher');
exception when duplicate_object then null; end $$;

do $$ begin
  create type readiness_status as enum ('pass','fail','pending');
exception when duplicate_object then null; end $$;

-- Tables
create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  task_type writing_task_type not null,
  slug text not null unique,
  topic text not null,
  difficulty smallint not null default 2 check (difficulty between 1 and 5),
  band9_sample text,
  outline_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.writing_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid not null references public.writing_prompts(id) on delete restrict,
  task_type writing_task_type not null,
  version_of uuid null references public.writing_attempts(id) on delete set null,
  status writing_attempt_status not null default 'draft',
  draft_text text not null default '',
  word_count integer not null default 0,
  time_spent_ms integer not null default 0,
  overall_band numeric(3,1),
  scores_json jsonb,
  feedback_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.writing_drill_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid null references public.writing_attempts(id) on delete set null,
  tags text[] not null default '{}',
  completed_at timestamptz not null default now()
);

create table if not exists public.writing_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.writing_attempts(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  role writing_review_role not null,
  scores_json jsonb,
  comments_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.writing_readiness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gates_json jsonb not null default '{}'::jsonb,
  window_start timestamptz,
  window_end timestamptz,
  status readiness_status not null default 'pending'
);

create table if not exists public.writing_metrics (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.writing_attempts(id) on delete cascade,
  ttr numeric,
  wpm numeric,
  cohesion_density numeric,
  template_overuse numeric,
  originality_score numeric,
  computed_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger trg_writing_attempts_updated_at
before update on public.writing_attempts
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_attempts_user on public.writing_attempts(user_id);
create index if not exists idx_attempts_prompt on public.writing_attempts(prompt_id);
create index if not exists idx_attempts_version_of on public.writing_attempts(version_of);
create index if not exists idx_drills_user_completed on public.writing_drill_events(user_id, completed_at);
create index if not exists idx_reviews_attempt on public.writing_reviews(attempt_id);
create index if not exists idx_metrics_attempt on public.writing_metrics(attempt_id);

-- RLS
alter table public.writing_prompts enable row level security;
alter table public.writing_attempts enable row level security;
alter table public.writing_drill_events enable row level security;
alter table public.writing_reviews enable row level security;
alter table public.writing_readiness enable row level security;
alter table public.writing_metrics enable row level security;

-- Policies: prompts (read by authenticated)
create policy if not exists sel_prompts_auth on public.writing_prompts
  for select using (auth.role() = 'authenticated');

-- Policies: attempts (owner only)
create policy if not exists ins_attempts_owner on public.writing_attempts
  for insert with check (auth.uid() = user_id);

create policy if not exists sel_attempts_owner on public.writing_attempts
  for select using (auth.uid() = user_id);

create policy if not exists upd_attempts_owner on public.writing_attempts
  for update using (auth.uid() = user_id);

create policy if not exists sel_attempts_teacher_admin on public.writing_attempts
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('teacher','admin')
    )
  );

-- Policies: drills (owner only)
create policy if not exists ins_drills_owner on public.writing_drill_events
  for insert with check (auth.uid() = user_id);

create policy if not exists sel_drills_owner on public.writing_drill_events
  for select using (auth.uid() = user_id);

-- Policies: reviews
-- Reviewer can insert their review; attempt owner and reviewer can read
create policy if not exists ins_reviews_reviewer on public.writing_reviews
  for insert with check (auth.uid() = reviewer_id);

create policy if not exists sel_reviews_owner_or_reviewer on public.writing_reviews
  for select using (
    auth.uid() = reviewer_id or
    exists (
      select 1 from public.writing_attempts a
      where a.id = writing_reviews.attempt_id and a.user_id = auth.uid()
    )
  );

create policy if not exists sel_reviews_teacher_admin on public.writing_reviews
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('teacher','admin')
    )
  );

-- Policies: readiness (owner select); writes by service role (RLS bypass)
create policy if not exists sel_readiness_owner on public.writing_readiness
  for select using (auth.uid() = user_id);

-- Policies: metrics (owner select); writes by service role
create policy if not exists sel_metrics_owner on public.writing_metrics
  for select using (
    exists (
      select 1 from public.writing_attempts a
      where a.id = writing_metrics.attempt_id and a.user_id = auth.uid()
    )
  );

-- Optional: extend mistakes table if present
do $$ begin
  perform 1 from information_schema.tables where table_schema='public' and table_name='mistakes';
  if found then
    execute 'alter table public.mistakes add column if not exists module text';
    execute 'alter table public.mistakes add column if not exists attempt_id uuid references public.writing_attempts(id) on delete set null';
  end if;
end $$;

-- Seed sample prompts (safe defaults)
insert into public.writing_prompts (task_type, slug, topic, difficulty, band9_sample, outline_json)
values
  ('task2','t2-screen-time-children','Should screen time for children be limited by law?',2,null,'{"pattern":"opinion"}'),
  ('task2','t2-public-transport-invest','Governments should invest more in public transport than roads.',3,null,'{"pattern":"discussion"}'),
  ('task1','t1-line-vs-bar-urban-pop','Line and bar chart of urban population growth 1990–2020',2,null,'{"type":"charts"}')
on conflict (slug) do nothing;

-- Grant minimal usage to anon/auth (read prompts); others via policies
grant usage on schema public to anon, authenticated;
