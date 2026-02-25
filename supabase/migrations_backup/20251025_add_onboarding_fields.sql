alter table if exists public.profiles
  add column if not exists preferred_language text,
  add column if not exists study_days text[] default '{}'::text[],
  add column if not exists study_minutes_per_day integer;

alter table if exists public.profiles
  alter column study_days set default '{}'::text[];

alter table if exists public.user_profiles
  add column if not exists study_days text[] default '{}'::text[],
  add column if not exists study_minutes_per_day integer,
  alter column preferred_language set default 'en';

update public.profiles
  set study_days = '{}'::text[]
  where study_days is null;
