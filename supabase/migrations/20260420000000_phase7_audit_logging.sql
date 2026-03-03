-- Phase 7: Audit logging + alerts infrastructure

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text,
  resource_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user_id on public.audit_logs (user_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_resource on public.audit_logs (resource);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_metadata_gin on public.audit_logs using gin (metadata);

alter table public.audit_logs enable row level security;

-- Users: no direct reads by default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_users_no_select'
  ) THEN
    CREATE POLICY audit_logs_users_no_select
      ON public.audit_logs
      FOR SELECT
      USING (false);
  END IF;
END $$;

-- Admins can read all logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_admin_select'
  ) THEN
    CREATE POLICY audit_logs_admin_select
      ON public.audit_logs
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

-- Service role can insert logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_logs_service_insert'
  ) THEN
    CREATE POLICY audit_logs_service_insert
      ON public.audit_logs
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;


create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_alerts_resolved_created on public.alerts (resolved, created_at desc);
create index if not exists idx_alerts_type on public.alerts (type);
create index if not exists idx_alerts_user on public.alerts (user_id);

alter table public.alerts enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alerts' AND policyname='alerts_admin_select'
  ) THEN
    CREATE POLICY alerts_admin_select
      ON public.alerts
      FOR SELECT
      USING (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alerts' AND policyname='alerts_admin_update'
  ) THEN
    CREATE POLICY alerts_admin_update
      ON public.alerts
      FOR UPDATE
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='alerts' AND policyname='alerts_service_insert'
  ) THEN
    CREATE POLICY alerts_service_insert
      ON public.alerts
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
