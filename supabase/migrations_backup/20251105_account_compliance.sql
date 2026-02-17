create extension if not exists pgcrypto;

create table if not exists public.account_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.account_audit_log enable row level security;

create policy if not exists "Users read own account audit log" on public.account_audit_log
  for select to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users write own account audit log" on public.account_audit_log
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Admins view all account audit log" on public.account_audit_log
  for select to authenticated
  using (auth.jwt()->>'role' = 'admin');

create table if not exists public.account_deletion_queue (
  user_id uuid primary key,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  purge_after timestamptz not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  metadata jsonb default '{}'::jsonb
);

alter table public.account_deletion_queue enable row level security;

alter table public.account_deletion_queue
  add constraint account_deletion_queue_status_check
  check (status in ('pending', 'purging', 'purged', 'error'));

create index if not exists account_deletion_queue_purge_idx
  on public.account_deletion_queue (purge_after);

create policy if not exists "Users manage own deletion queue" on public.account_deletion_queue
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Admins manage deletion queue" on public.account_deletion_queue
  for all to authenticated
  using (auth.jwt()->>'role' = 'admin')
  with check (auth.jwt()->>'role' = 'admin');

create table if not exists public.account_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique,
  payload jsonb not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  downloaded_at timestamptz
);

alter table public.account_exports enable row level security;

create index if not exists account_exports_exp_idx
  on public.account_exports (expires_at);

create policy if not exists "Users manage own exports" on public.account_exports
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table if exists public.profiles
  add column if not exists pending_deletion boolean default false,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_confirmed_at timestamptz;
