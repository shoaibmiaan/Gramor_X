-- 20260331_adaptive_paths.sql
-- Schema for adaptive study path recommender tables and seed content.

create table if not exists public.learning_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  module text not null check (module in ('listening','reading','writing','speaking','vocab')),
  type text not null check (type in ('drill','mock','lesson','review')),
  est_minutes integer not null check (est_minutes > 0),
  tags text[] not null default '{}',
  difficulty text,
  metadata jsonb not null default '{}'::jsonb,
  min_plan text not null default 'free' check (min_plan in ('free','starter','booster','master')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_tasks_module_idx
  on public.learning_tasks (module, type, is_active)
  where is_active;

create trigger learning_tasks_touch_updated
  before update on public.learning_tasks
  for each row
  execute procedure public.touch_updated_at();

alter table public.learning_tasks enable row level security;

drop policy if exists "Anyone can read learning tasks" on public.learning_tasks;
create policy "Anyone can read learning tasks"
  on public.learning_tasks
  for select
  using (is_active);

drop policy if exists "Staff manage learning tasks" on public.learning_tasks;
create policy "Staff manage learning tasks"
  on public.learning_tasks
  for all
  using (auth.jwt()->>'role' in ('admin','teacher'))
  with check (auth.jwt()->>'role' in ('admin','teacher'));

-- Learning signals ----------------------------------------------------------------

create table if not exists public.learning_signals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null check (module in ('listening','reading','writing','speaking','vocab')),
  key text not null,
  value numeric not null,
  source text not null,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists learning_signals_user_idx
  on public.learning_signals (user_id, module, occurred_at desc);

alter table public.learning_signals enable row level security;

drop policy if exists "Users read their learning signals" on public.learning_signals;
create policy "Users read their learning signals"
  on public.learning_signals
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert learning signals" on public.learning_signals;
create policy "Users insert learning signals"
  on public.learning_signals
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their learning signals" on public.learning_signals;
create policy "Users manage their learning signals"
  on public.learning_signals
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their learning signals" on public.learning_signals;
create policy "Users delete their learning signals"
  on public.learning_signals
  for delete
  using (auth.uid() = user_id);

-- Learning profiles ---------------------------------------------------------------

create table if not exists public.learning_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_band numeric,
  speaking_pron numeric,
  speaking_fluency numeric,
  reading_tfng numeric,
  reading_mcq numeric,
  writing_task2 numeric,
  vocab_range numeric,
  listening_accuracy numeric,
  last_updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger learning_profiles_touch_updated
  before update on public.learning_profiles
  for each row
  execute procedure public.touch_updated_at();

alter table public.learning_profiles enable row level security;

drop policy if exists "Users read their learning profile" on public.learning_profiles;
create policy "Users read their learning profile"
  on public.learning_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert their learning profile" on public.learning_profiles;
create policy "Users upsert their learning profile"
  on public.learning_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their learning profile" on public.learning_profiles;
create policy "Users update their learning profile"
  on public.learning_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recommendations -----------------------------------------------------------------

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.learning_tasks(id) on delete cascade,
  reason text not null,
  score numeric not null,
  status text not null default 'pending' check (status in ('pending','shown','accepted','skipped','completed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists recommendations_user_idx
  on public.recommendations (user_id, created_at desc);

alter table public.recommendations enable row level security;

drop policy if exists "Users read their recommendations" on public.recommendations;
create policy "Users read their recommendations"
  on public.recommendations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert recommendations" on public.recommendations;
create policy "Users insert recommendations"
  on public.recommendations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their recommendations" on public.recommendations;
create policy "Users update their recommendations"
  on public.recommendations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Task runs -----------------------------------------------------------------------

create table if not exists public.task_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.learning_tasks(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  outcome jsonb,
  band_delta numeric,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists task_runs_user_idx
  on public.task_runs (user_id, started_at desc);

alter table public.task_runs enable row level security;

drop policy if exists "Users read their task runs" on public.task_runs;
create policy "Users read their task runs"
  on public.task_runs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert task runs" on public.task_runs;
create policy "Users insert task runs"
  on public.task_runs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their task runs" on public.task_runs;
create policy "Users update their task runs"
  on public.task_runs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their task runs" on public.task_runs;
create policy "Users delete their task runs"
  on public.task_runs
  for delete
  using (auth.uid() = user_id);

-- Seed core learning tasks --------------------------------------------------------

insert into public.learning_tasks (slug, module, type, est_minutes, tags, difficulty, metadata, min_plan)
values
  (
    'speaking-ipa-th',
    'speaking',
    'drill',
    10,
    array['focus:speaking_pron','ipa:/θ/','band<7'],
    'B2',
    jsonb_build_object(
      'title', 'Polish your /θ/ sound',
      'summary', 'Targeted IPA drill with contrast pairs and playback.',
      'deeplink', '/speaking/coach/ipa-th'
    ),
    'starter'
  ),
  (
    'speaking-fluency-paced',
    'speaking',
    'drill',
    12,
    array['focus:speaking_fluency','pace','fillers'],
    'B2',
    jsonb_build_object(
      'title', 'Fluency tempo workout',
      'summary', 'Metronome-guided response practice to reduce fillers.',
      'deeplink', '/speaking/coach/fluency'
    ),
    'free'
  ),
  (
    'speaking-cue-card-confidence',
    'speaking',
    'mock',
    15,
    array['focus:speaking_structure','cue-card'],
    'C1',
    jsonb_build_object(
      'title', 'Cue card confidence run',
      'summary', 'Two-minute cue card practice with structure prompts.',
      'deeplink', '/speaking/coach/free'
    ),
    'starter'
  ),
  (
    'reading-tfng-pack1',
    'reading',
    'drill',
    12,
    array['focus:reading_tfng','band<6.5'],
    'B2',
    jsonb_build_object(
      'title', 'True/False/Not Given pack',
      'summary', '10-question micro set with explained answers.',
      'deeplink', '/reading/drills/tfng-pack1'
    ),
    'free'
  ),
  (
    'reading-skim-speed',
    'reading',
    'lesson',
    8,
    array['focus:reading_speed','strategy'],
    'B1',
    jsonb_build_object(
      'title', 'Skimming for speed',
      'summary', 'Guided skim tactics with stopwatch challenges.',
      'deeplink', '/reading/lessons/skimming'
    ),
    'free'
  ),
  (
    'reading-mcq-precision',
    'reading',
    'drill',
    14,
    array['focus:reading_mcq','band<7'],
    'B2',
    jsonb_build_object(
      'title', 'MCQ accuracy booster',
      'summary', 'Practice 8 medium MCQs with explanation stack.',
      'deeplink', '/reading/drills/mcq-precision'
    ),
    'starter'
  ),
  (
    'writing-task2-outline-discipline',
    'writing',
    'lesson',
    15,
    array['focus:writing_task2','planning'],
    'C1',
    jsonb_build_object(
      'title', 'Task 2 outline discipline',
      'summary', 'Rapid planning reps with examiner checklists.',
      'deeplink', '/writing/lessons/task2-outline'
    ),
    'starter'
  ),
  (
    'writing-task1-trend-language',
    'writing',
    'review',
    12,
    array['focus:writing_overview','task1'],
    'B2',
    jsonb_build_object(
      'title', 'Task 1 trend language review',
      'summary', 'Upgrade overview sentences with model comparisons.',
      'deeplink', '/writing/review/task1-trend-language'
    ),
    'free'
  ),
  (
    'listening-map-matching',
    'listening',
    'drill',
    10,
    array['focus:listening_map','band<6.5'],
    'B1',
    jsonb_build_object(
      'title', 'Map matching sprint',
      'summary', 'Section 2 map tasks with accent variety.',
      'deeplink', '/listening/drills/map-matching'
    ),
    'free'
  ),
  (
    'listening-distractor-awareness',
    'listening',
    'lesson',
    9,
    array['focus:listening_detail','distractors'],
    'B2',
    jsonb_build_object(
      'title', 'Distractor awareness tune-up',
      'summary', 'Spot common traps with guided audio breakdowns.',
      'deeplink', '/listening/lessons/distractors'
    ),
    'free'
  ),
  (
    'vocab-range-collocations',
    'vocab',
    'drill',
    6,
    array['focus:vocab_range','collocation'],
    'B2',
    jsonb_build_object(
      'title', 'Collocation burst',
      'summary', 'Rapid-fire pairing for high-yield collocations.',
      'deeplink', '/vocabulary/drills/collocations'
    ),
    'free'
  ),
  (
    'vocab-academic-band7',
    'vocab',
    'lesson',
    10,
    array['focus:vocab_band7','academic'],
    'C1',
    jsonb_build_object(
      'title', 'Academic lexis pack',
      'summary', 'Band 7+ academic vocabulary with usage notes.',
      'deeplink', '/vocabulary/packs/academic-band7'
    ),
    'starter'
  )
  on conflict (slug) do update
    set module = excluded.module,
        type = excluded.type,
        est_minutes = excluded.est_minutes,
        tags = excluded.tags,
        difficulty = excluded.difficulty,
        metadata = excluded.metadata,
        min_plan = excluded.min_plan,
        is_active = excluded.is_active,
        updated_at = timezone('utc', now());
