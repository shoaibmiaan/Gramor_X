create table if not exists public.notification_logs (
  id uuid primary key default uuid_generate_v4(),
  job_name text not null,
  run_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  channel text,
  status text not null,
  message text,
  error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.notification_logs enable row level security;

-- Service roles only (no RLS policies for end users)
