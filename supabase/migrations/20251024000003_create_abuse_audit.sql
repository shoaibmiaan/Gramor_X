-- 20251024000003_create_abuse_audit_safe.sql
-- Safe, idempotent API abuse audit log table

-- Create table if not exists (with quoted "window" column)
CREATE TABLE IF NOT EXISTS public.api_abuse_log (
  id bigserial PRIMARY KEY,
  user_id uuid,
  route text NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  "window" text NOT NULL DEFAULT 'unspecified',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS api_abuse_log_route_idx ON public.api_abuse_log (route, created_at DESC);
CREATE INDEX IF NOT EXISTS api_abuse_log_user_idx ON public.api_abuse_log (user_id, created_at DESC);