-- 20251111_listening_usage_limits.sql
-- Ensure usage_key enum has our new keys; create if missing.

do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'usage_key' and n.nspname = 'public') then
    create type public.usage_key as enum ();
  end if;
end$$;

-- Helper to add enum value if missing
do $$
begin
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'usage_key' and e.enumlabel = 'ai.listening.dictation') then
    alter type public.usage_key add value 'ai.listening.dictation';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'usage_key' and e.enumlabel = 'ai.listening.accent') then
    alter type public.usage_key add value 'ai.listening.accent';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'usage_key' and e.enumlabel = 'mock.listening.start') then
    alter type public.usage_key add value 'mock.listening.start';
  end if;
  if not exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
                 where t.typname = 'usage_key' and e.enumlabel = 'mock.listening.submit') then
    alter type public.usage_key add value 'mock.listening.submit';
  end if;
end$$;

-- Ensure plan_limits table exists (idempotent skeleton)
create table if not exists public.plan_limits (
  plan_id text not null,                 -- 'free' | 'starter' | 'booster' | 'master'
  key public.usage_key not null,
  per_day int,
  per_month int,
  constraint plan_limits_unique unique (plan_id, key)
);

-- Seed limits (insert-if-missing)
insert into public.plan_limits (plan_id, key, per_day, per_month)
select * from (values
  ('free',    'ai.listening.dictation'::public.usage_key, 5,   null),
  ('free',    'ai.listening.accent'::public.usage_key,    5,   null),
  ('free',    'mock.listening.start'::public.usage_key,   1,   null),
  ('free',    'mock.listening.submit'::public.usage_key,  1,   null),

  ('starter', 'ai.listening.dictation'::public.usage_key, 20,  null),
  ('starter', 'ai.listening.accent'::public.usage_key,    20,  null),
  ('starter', 'mock.listening.start'::public.usage_key,   2,   null),
  ('starter', 'mock.listening.submit'::public.usage_key,  2,   null),

  ('booster', 'ai.listening.dictation'::public.usage_key, 50,  null),
  ('booster', 'ai.listening.accent'::public.usage_key,    50,  null),
  ('booster', 'mock.listening.start'::public.usage_key,   5,   null),
  ('booster', 'mock.listening.submit'::public.usage_key,  5,   null),

  ('master',  'ai.listening.dictation'::public.usage_key, null, null),
  ('master',  'ai.listening.accent'::public.usage_key,    null, null),
  ('master',  'mock.listening.start'::public.usage_key,   null, null),
  ('master',  'mock.listening.submit'::public.usage_key,  null, null)
) v(plan_id, key, per_day, per_month)
where not exists (
  select 1 from public.plan_limits pl
  where pl.plan_id = v.plan_id and pl.key = v.key
);
