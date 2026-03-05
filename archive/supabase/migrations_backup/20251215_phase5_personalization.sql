-- Phase 5 personalization additions: topic focus & daily quota
alter table public.profiles
  add column if not exists focus_topics text[] default '{}'::text[];

alter table public.profiles
  add column if not exists daily_quota_goal integer;
