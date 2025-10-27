-- Add subscription_tier enum and profile column (idempotent + safe backfill)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier' and typnamespace = 'public'::regnamespace) then
    create type public.subscription_tier as enum ('free', 'seedling', 'rocket', 'owl');
  end if;
end$$;

alter table if exists public.profiles
  add column if not exists tier public.subscription_tier default 'free';

update public.profiles
set tier = 'free'
where tier is null;

alter table if exists public.profiles
  alter column tier set not null;

-- (Future) RLS/tier gates go in later migrations when content tables exist.
