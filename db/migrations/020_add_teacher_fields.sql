-- Adds teacher fields to profiles (adjust table name if yours differs)
alter table public.profiles
  add column if not exists role text not null default 'user',
  add column if not exists teacher_onboarding_completed boolean not null default false,
  add column if not exists teacher_approved boolean not null default false,
  add column if not exists teacher_subjects text[] default '{}',
  add column if not exists teacher_bio text,
  add column if not exists teacher_experience_years int,
  add column if not exists teacher_cv_url text;

comment on column public.profiles.role is 'user | teacher | admin';
