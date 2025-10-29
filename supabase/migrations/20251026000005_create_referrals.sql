-- 20251026_create_referrals.sql
-- Normalised referral + credit ledger schema.

create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  deactivated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists referral_codes_code_idx on public.referral_codes (code);

alter table public.referral_codes enable row level security;

create policy if not exists "referral_codes_self_select"
  on public.referral_codes
  for select
  using (auth.uid() = user_id);

create policy if not exists "referral_codes_self_insert"
  on public.referral_codes
  for insert
  with check (auth.uid() = user_id);

create policy if not exists "referral_codes_self_update"
  on public.referral_codes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.referral_redemptions (
  id bigserial primary key,
  code text not null references public.referral_codes(code) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  device_hash text,
  referrer_credit integer not null default 0,
  referred_credit integer not null default 0,
  status text not null default 'completed',
  context text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz
);

create index if not exists referral_redemptions_code_idx on public.referral_redemptions (code);
create index if not exists referral_redemptions_referrer_idx on public.referral_redemptions (referrer_id, created_at desc);
create index if not exists referral_redemptions_referred_idx on public.referral_redemptions (referred_id, created_at desc);
create unique index if not exists referral_redemptions_device_hash_key
  on public.referral_redemptions (device_hash)
  where device_hash is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'referral_redemptions_referred_unique'
  ) then
    alter table public.referral_redemptions
      add constraint referral_redemptions_referred_unique unique (referred_id);
  end if;
end $$;

alter table public.referral_redemptions enable row level security;

create policy if not exists "referral_redemptions_party_select"
  on public.referral_redemptions
  for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

create policy if not exists "referral_redemptions_self_insert"
  on public.referral_redemptions
  for insert
  with check (auth.uid() = referred_id);

create policy if not exists "referral_redemptions_self_update"
  on public.referral_redemptions
  for update
  using (auth.uid() = referrer_id or auth.uid() = referred_id)
  with check (auth.uid() = referrer_id or auth.uid() = referred_id);

create table if not exists public.referral_credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  lifetime_earned integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.referral_credit_balances enable row level security;

create policy if not exists "referral_credit_balances_self"
  on public.referral_credit_balances
  for select
  using (auth.uid() = user_id);

create table if not exists public.referral_credit_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists referral_credit_events_user_idx on public.referral_credit_events (user_id, created_at desc);

alter table public.referral_credit_events enable row level security;

create policy if not exists "referral_credit_events_self"
  on public.referral_credit_events
  for select
  using (auth.uid() = user_id);
