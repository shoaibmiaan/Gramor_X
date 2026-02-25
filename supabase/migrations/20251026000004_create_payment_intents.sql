-- 20251026_create_payment_intents.sql
-- Unified payment intent tracking for Stripe and local gateways.

-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  cycle text not null,
  provider text not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  gateway_session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz,
  failure_code text,
  failure_message text
);

create index if not exists payment_intents_user_idx
  on public.payment_intents (user_id, created_at desc);

create index if not exists payment_intents_status_idx
  on public.payment_intents (status, created_at desc);

create unique index if not exists payment_intents_gateway_session_key
  on public.payment_intents (gateway_session_id);

alter table public.payment_intents enable row level security;

-- Recreate policies idempotently (Postgres doesn't support IF NOT EXISTS on CREATE POLICY)
drop policy if exists "payment_intents_self_select" on public.payment_intents;

create policy "payment_intents_self_select"
  on public.payment_intents
  for select
  using (auth.uid() = user_id);

--------------------------------------------------------------------------------

create table if not exists public.payment_intent_events (
  id bigserial primary key,
  intent_id uuid not null references public.payment_intents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_intent_events_intent_idx
  on public.payment_intent_events (intent_id, created_at desc);

create index if not exists payment_intent_events_user_idx
  on public.payment_intent_events (user_id, created_at desc);

alter table public.payment_intent_events enable row level security;

drop policy if exists "payment_intent_events_self" on public.payment_intent_events;

create policy "payment_intent_events_self"
  on public.payment_intent_events
  for select
  using (auth.uid() = user_id);
