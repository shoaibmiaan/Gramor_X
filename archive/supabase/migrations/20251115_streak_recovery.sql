-- 1) Tokens table

create table if not exists public.streak_recovery_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  -- optional: why granted?
  source text default 'system', -- 'system', 'admin', 'promo'
  -- snapshot of streak at time granted (not required but useful)
  streak_at_grant integer,
  constraint streak_recovery_tokens_one_open_per_user
    exclude using gist (user_id with =)
    where (consumed_at is null)
);

alter table public.streak_recovery_tokens enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'streak_recovery_tokens'
      and policyname = 'Users can see their own streak recovery tokens'
  ) then
    create policy "Users can see their own streak recovery tokens"
      on public.streak_recovery_tokens
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

-- 2) Function: grant a token if user qualifies

create or replace function public.grant_streak_recovery_token(
  p_user_id uuid,
  p_reason text default 'system'
)
returns void
language plpgsql
security definer
as $$
declare
  v_streak public.streaks%rowtype;
  v_open_token_exists boolean;
begin
  if p_user_id is null then
    return;
  end if;

  -- Don't stack multiple open tokens
  select exists (
    select 1 from public.streak_recovery_tokens
    where user_id = p_user_id and consumed_at is null
  )
  into v_open_token_exists;

  if v_open_token_exists then
    return;
  end if;

  select * into v_streak
  from public.streaks
  where user_id = p_user_id;

  -- Require a meaningful streak before giving token, e.g. >= 5
  if not found or coalesce(v_streak.current, 0) < 5 then
    return;
  end if;

  insert into public.streak_recovery_tokens (user_id, source, streak_at_grant)
  values (p_user_id, p_reason, v_streak.current);
end;
$$;

-- 3) Optional: auto-grant token when user hits a milestone (e.g., 7, 30, 60 days)

create or replace function public.maybe_grant_streak_milestone_token(
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_streak public.streaks%rowtype;
begin
  if p_user_id is null then return; end if;

  select * into v_streak
  from public.streaks
  where user_id = p_user_id;

  if not found then return; end if;

  if v_streak.current in (7, 30, 60, 90) then
    perform public.grant_streak_recovery_token(p_user_id, 'milestone');
  end if;
end;
$$;
