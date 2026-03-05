-- ─────────────────────────────────────────────────────────────────────────────
-- Shared helper: touch_updated_at()
-- Updates NEW.updated_at to UTC "now" on UPDATE triggers.
-- Safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE' then
    new.updated_at := timezone('utc', now());
  end if;
  return new;
end;
$$;

-- Optional: ensure extension for gen_random_uuid (usually pre-enabled on Supabase)
create extension if not exists pgcrypto;
