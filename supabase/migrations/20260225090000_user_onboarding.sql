create table if not exists public.user_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  target_band numeric(2,1) not null check (target_band >= 5.0 and target_band <= 9.0),
  exam_date date not null,
  reading_level int not null check (reading_level between 1 and 5),
  writing_level int not null check (writing_level between 1 and 5),
  listening_level int not null check (listening_level between 1 and 5),
  speaking_level int not null check (speaking_level between 1 and 5),
  learning_style text not null,
  generated_plan jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_onboarding enable row level security;

drop policy if exists "user_onboarding_select_own" on public.user_onboarding;
create policy "user_onboarding_select_own"
  on public.user_onboarding
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_onboarding_insert_own" on public.user_onboarding;
create policy "user_onboarding_insert_own"
  on public.user_onboarding
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_onboarding_update_own" on public.user_onboarding;
create policy "user_onboarding_update_own"
  on public.user_onboarding
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
