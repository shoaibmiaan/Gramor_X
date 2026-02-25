-- 20251023_create_study_plan_focus.sql
-- Lightweight table that stores weighted focus tags per user and skill.

create table if not exists public.study_plan_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  area text not null default 'writing' check (area = 'writing'),
  tag text not null,
  weight numeric not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists study_plan_focus_unique on public.study_plan_focus(user_id, area, tag);
create index if not exists study_plan_focus_user_idx on public.study_plan_focus(user_id, updated_at desc);

alter table if exists public.study_plan_focus enable row level security;

do $$ begin
  create policy study_plan_focus_owner_rw on public.study_plan_focus
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy study_plan_focus_staff_full on public.study_plan_focus
    for all
    to authenticated
    using (auth.jwt()->>'role' in ('teacher','admin'))
    with check (auth.jwt()->>'role' in ('teacher','admin'));
exception when duplicate_object then null;
end $$;

comment on table public.study_plan_focus is 'Weighted focus areas powering personalised study plan suggestions.';
