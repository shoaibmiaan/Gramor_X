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
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_id uuid null references public.writing_attempts(id) on delete set null,
  tags text[] not null default '{}',
  completed_at timestamptz not null default now()
);

create table if not exists public.writing_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.writing_attempts(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  role writing_review_role not null,
  scores_json jsonb,
  comments_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.writing_readiness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
    execute 'alter table public.mistakes add column if not exists pattern text';
    execute 'alter table public.mistakes add column if not exists example text';
    execute 'alter table public.mistakes add column if not exists fix text';
    execute 'alter table public.mistakes add column if not exists attempt_id uuid references public.writing_attempts(id) on delete set null';
  end if;
end $$;

-- Seed sample prompts covering key IELTS patterns
insert into public.writing_prompts (task_type, slug, topic, difficulty, band9_sample, outline_json)
values
  -- Task 2 — Opinion
  (
    'task2',
    't2-remote-work-balance',
    'Some people think employees are more productive when working from home, while others believe offices are essential. Discuss both views and give your opinion.',
    3,
    'Remote work can unlock deep-focus time and broaden hiring pools, yet thriving hybrid teams still choreograph deliberate in-person moments. A balanced approach blends quiet home sprints with purposeful office collaboration, reinforcing culture while respecting autonomy.',
    '{"pattern":"opinion","recommendedStructure":["Paraphrase prompt","State clear view","Support with two reasons","Address counterpoint"]}'::jsonb
  ),
  (
    'task2',
    't2-cities-green-space',
    'City planners should allocate more land to parks and public gardens instead of commercial buildings. To what extent do you agree or disagree?',
    2,
    'Verdant public spaces anchor urban wellbeing: they moderate heat, invite movement, and knit neighbours together. Prioritising them over endless retail blocks sustains livable, resilient cities.',
    '{"pattern":"opinion","hooks":["Urban wellbeing","Heat mitigation","Community ties"]}'::jsonb
  ),
  ('task2','t2-cashless-society','A cashless society benefits everyone. To what extent do you agree?',3,null,'{"pattern":"opinion","keyPoints":["Financial inclusion","Data privacy","Resilience"]}'::jsonb),
  ('task2','t2-language-immersion','Students should spend a year abroad to master a foreign language. Do you agree or disagree?',3,null,'{"pattern":"opinion","keyPoints":["Immersion gains","Cost barriers","Digital alternatives"]}'::jsonb),
  ('task2','t2-ai-education-balance','Artificial intelligence tutors will replace classroom teachers in the future. Do you agree or disagree?',4,null,'{"pattern":"opinion","keyPoints":["Personalisation","Human mentorship","Equity"]}'::jsonb),
  -- Task 2 — Discussion
  ('task2','t2-higher-education-free','Some believe university should be free for everyone, while others think students should pay their own tuition. Discuss both views and give your opinion.',3,null,'{"pattern":"discussion","stances":["State-funded","Student-funded"]}'::jsonb),
  ('task2','t2-art-vs-science-funding','Governments should invest more in science education than in the arts. Discuss both sides and provide your opinion.',3,null,'{"pattern":"discussion","stances":["STEM focus","Arts parity"]}'::jsonb),
  ('task2','t2-megacities-future','Some say mega-cities are unsustainable, while others argue they are essential for economic growth. Discuss both views and give your opinion.',4,null,'{"pattern":"discussion","stances":["Unsustainable","Economic engine"],"outline":["Introduce debate","Analyse strain","Analyse benefits","Balanced conclusion"]}'::jsonb),
  ('task2','t2-climate-individual-vs-government','Fighting climate change is the responsibility of individuals as much as governments. Discuss both views and give your opinion.',2,null,'{"pattern":"discussion","stances":["Individual action","Government leadership"]}'::jsonb),
  ('task2','t2-urban-transport-ownership','Car ownership should be limited in city centres. Discuss both views and give your opinion.',2,null,'{"pattern":"discussion","stances":["Restrict cars","Personal freedom"]}'::jsonb),
  -- Task 2 — Problem / Solution
  ('task2','t2-plastic-waste-crisis','Plastic waste is damaging oceans worldwide. What problems does this cause and what solutions could be proposed?',3,null,'{"pattern":"problem-solution","problemAreas":["Wildlife harm","Microplastics"],"solutions":["Extended producer responsibility","Deposit schemes"]}'::jsonb),
  ('task2','t2-traffic-congestion-metro','Traffic congestion is a growing issue in major cities. Discuss the problems it causes and suggest solutions.',2,null,'{"pattern":"problem-solution","solutions":["Congestion pricing","Transit investment"]}'::jsonb),
  ('task2','t2-teen-mental-health','Rising stress levels among teenagers are a serious concern. Identify the problems and propose solutions.',3,null,'{"pattern":"problem-solution","problemAreas":["Academic pressure","Social media"],"solutions":["School counsellors","Digital literacy"]}'::jsonb),
  ('task2','t2-digital-privacy-erosion','People are losing control of their personal data online. What problems does this create and how can individuals be protected?',4,null,'{"pattern":"problem-solution","solutions":["Stronger regulation","Privacy-by-design"]}'::jsonb),
  ('task2','t2-food-waste-cities','A large amount of food is wasted in cities. What are the reasons for this and what can be done?',2,null,'{"pattern":"problem-solution","solutions":["Smart inventory","Donation partnerships"]}'::jsonb),
  -- Task 2 — Advantages / Disadvantages
  ('task2','t2-gap-year-before-uni','Taking a gap year before university has become increasingly popular. Discuss the advantages and disadvantages.',2,null,'{"pattern":"advantages-disadvantages","angles":["Global exposure","Lost momentum"]}'::jsonb),
  ('task2','t2-remote-learning-expansion','Online learning is replacing traditional classrooms. What are the advantages and disadvantages?',3,null,'{"pattern":"advantages-disadvantages","angles":["Flexibility","Isolation"]}'::jsonb),
  ('task2','t2-working-abroad-pros-cons','Working abroad for several years can boost a person''s career. Discuss the advantages and disadvantages.',3,null,'{"pattern":"advantages-disadvantages","angles":["Career capital","Reintegration"]}'::jsonb),
  ('task2','t2-smart-homes','Smart home technology is becoming more common. Discuss the advantages and disadvantages.',2,null,'{"pattern":"advantages-disadvantages","angles":["Convenience","Data security"]}'::jsonb),
  ('task2','t2-extended-life-expectancy','People are living longer than ever before. Discuss the advantages and disadvantages for individuals and society.',3,null,'{"pattern":"advantages-disadvantages","angles":["Experience","Healthcare strain"]}'::jsonb),
  -- Task 1 — Charts, processes, maps
  (
    'task1',
    't1-line-renewable-growth',
    'Line chart comparing the share of renewable electricity in five countries between 2000 and 2025',
    3,
    'Overall, every country increased its reliance on renewable electricity, with Germany and Spain leading the transition while Australia lagged slightly behind. After a gradual climb in the early 2000s, growth accelerated post-2015 when subsidy reforms arrived.',
    '{"type":"chart","chart":"line","keyFocus":["Overall trend","Leaders vs laggards","Notable years"]}'::jsonb
  ),
  (
    'task1',
    't1-process-recycling-loop',
    'Process diagram showing how household plastic is collected, sorted, and remanufactured',
    2,
    'The diagram illustrates a closed-loop recycling system beginning with kerbside collection, progressing through sorting and washing, and culminating in pellet production that feeds new manufacturing. Crucially, contamination checks at the washing stage keep the cycle efficient.',
    '{"type":"process","steps":["Collection","Sorting","Washing","Pelletising","Manufacturing"]}'::jsonb
  ),
  ('task1','t1-bar-unemployment-industry','Bar chart comparing unemployment rates by industry in 2010 and 2020',2,null,'{"type":"chart","chart":"bar","comparisons":["Manufacturing","Hospitality","Technology"]}'::jsonb),
  ('task1','t1-pie-energy-mix','Pie charts showing household energy consumption by category in two countries',2,null,'{"type":"chart","chart":"pie","angles":["Heating","Cooking","Cooling"]}'::jsonb),
  ('task1','t1-process-coffee-production','Process chart describing how coffee is produced from bean to cup',1,null,'{"type":"process","steps":["Harvest","Dry","Roast","Grind","Brew"]}'::jsonb),
  ('task1','t1-map-city-development','Maps showing a city centre in 1990 and today',3,null,'{"type":"map","focus":["Land use","Transport links","Green spaces"]}'::jsonb),
  ('task1','t1-map-tourist-town','Maps illustrating proposed improvements to a seaside town for tourism',2,null,'{"type":"map","focus":["Accommodation","Attractions","Traffic flow"]}'::jsonb),
  ('task1','t1-table-student-enrolment','Table comparing overseas student enrolments in five universities from 2012 to 2022',3,null,'{"type":"table","focus":["Top growth","Stable","Declines"]}'::jsonb),
  ('task1','t1-bar-transport-usage','Bar chart of daily transport usage in a metropolitan area',2,null,'{"type":"chart","chart":"bar","angles":["Modal share","Peak usage"]}'::jsonb),
  ('task1','t1-line-water-consumption','Line graph of per capita water consumption in three regions between 1995 and 2020',2,null,'{"type":"chart","chart":"line","keyPoints":["Overall decline","Plateaus","Divergence"]}'::jsonb),
  ('task1','t1-pie-household-budget','Pie charts comparing household expenditure categories in 2005 and 2020',2,null,'{"type":"chart","chart":"pie","angles":["Essentials","Discretionary","Savings"]}'::jsonb),
  ('task1','t1-process-water-cycle','Process diagram explaining the natural water cycle',1,null,'{"type":"process","steps":["Evaporation","Condensation","Precipitation","Collection"]}'::jsonb),
  ('task1','t1-line-internet-penetration','Line graph of internet penetration rates in three continents from 2000 to 2022',2,null,'{"type":"chart","chart":"line","angles":["Starting point","Inflection","Gap closing"]}'::jsonb),
  ('task1','t1-map-rail-network','Maps comparing a regional rail network before and after planned upgrades',3,null,'{"type":"map","focus":["New lines","Stations","Interchanges"]}'::jsonb),
  ('task1','t1-bar-language-learning','Bar chart tracking adults enrolled in language courses by delivery mode',1,null,'{"type":"chart","chart":"bar","angles":["In-person","Online","Hybrid"]}'::jsonb)
on conflict (slug) do nothing;

-- Grant minimal usage to anon/auth (read prompts); others via policies
grant usage on schema public to anon, authenticated;
