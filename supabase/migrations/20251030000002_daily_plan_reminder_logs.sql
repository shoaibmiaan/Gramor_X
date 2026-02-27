-- 20251030000002_daily_plan_reminder_logs_safe.sql
-- Safe creation of notification_logs table

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name text NOT NULL,
  run_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  channel text,
  status text NOT NULL,
  message text,
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (no user policies; service role only)
ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;