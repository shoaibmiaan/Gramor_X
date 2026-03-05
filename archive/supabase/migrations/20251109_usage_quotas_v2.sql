-- 20251109_usage_quotas_v2.sql
-- Idempotent quota infra: enums, tables, indexes, RLS, helpers, RPCs.
-- Coexists with prior 20251006_* quotas migration (guards included).

-- === ENUMS ===================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usage_key') THEN
    CREATE TYPE usage_key AS ENUM (
      'ai.writing.grade',
      'ai.speaking.grade',
      'ai.explain',
      'mock.start',
      'mock.submit'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quota_period') THEN
    CREATE TYPE quota_period AS ENUM ('day', 'month');
  END IF;
END$$;

-- === TABLES ==================================================================
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_id     text        NOT NULL,
  key         usage_key   NOT NULL,
  per_day     integer     NULL,  -- NULL means unlimited
  per_month   integer     NULL,  -- optional; NULL means unlimited
  CONSTRAINT plan_limits_pkey PRIMARY KEY (plan_id, key)
);

CREATE TABLE IF NOT EXISTS public.user_quota_counters (
  user_id     uuid        NOT NULL,
  key         usage_key   NOT NULL,
  day_date    date        NOT NULL, -- UTC calendar day
  count       integer     NOT NULL DEFAULT 0,
  CONSTRAINT user_quota_counters_pkey PRIMARY KEY (user_id, key, day_date)
);

CREATE TABLE IF NOT EXISTS public.user_quota_ledger (
  id          bigserial   PRIMARY KEY,
  user_id     uuid        NOT NULL,
  key         usage_key   NOT NULL,
  amount      integer     NOT NULL DEFAULT 1,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  details     jsonb       NULL
);

-- === INDEXES =================================================================
CREATE INDEX IF NOT EXISTS idx_uql_user_key_time
  ON public.user_quota_ledger (user_id, key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_uqc_user_day
  ON public.user_quota_counters (user_id, day_date DESC);

-- === RLS =====================================================================
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quota_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quota_ledger ENABLE ROW LEVEL SECURITY;

-- Allow only service role to manage plan_limits.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plan_limits' AND policyname = 'plan_limits_service_rw'
  ) THEN
    CREATE POLICY plan_limits_service_rw
      ON public.plan_limits
      USING (current_setting('request.jwt.claims', true)::jsonb ? 'role'
             AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role')
      WITH CHECK (current_setting('request.jwt.claims', true)::jsonb ? 'role'
             AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');
  END IF;
END$$;

-- Users can see their own counters + ledger; inserts/updates go via RPC (definer).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_quota_counters' AND policyname = 'uqc_select_own'
  ) THEN
    CREATE POLICY uqc_select_own
      ON public.user_quota_counters
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_quota_ledger' AND policyname = 'uql_select_own'
  ) THEN
    CREATE POLICY uql_select_own
      ON public.user_quota_ledger
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- === HELPERS =================================================================
-- Upsert counter row (internal)
CREATE OR REPLACE FUNCTION public._quota_upsert_counter(
  p_user_id uuid,
  p_key usage_key,
  p_day date,
  p_increment integer
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_quota_counters AS c (user_id, key, day_date, count)
  VALUES (p_user_id, p_key, p_day, GREATEST(0, p_increment))
  ON CONFLICT (user_id, key, day_date)
  DO UPDATE SET count = GREATEST(0, c.count + EXCLUDED.count);
END$$;

-- Get existing day count (internal)
CREATE OR REPLACE FUNCTION public._quota_day_count(
  p_user_id uuid,
  p_key usage_key,
  p_day date
) RETURNS integer
LANGUAGE sql
AS $$
  SELECT COALESCE((
    SELECT count FROM public.user_quota_counters
    WHERE user_id = p_user_id AND key = p_key AND day_date = p_day
  ), 0)
$$;

-- Resolve per-day limit from plan_limits optionally; NULL => unlimited
CREATE OR REPLACE FUNCTION public._quota_plan_day_limit(
  p_plan_id text,
  p_key usage_key
) RETURNS integer
LANGUAGE sql
AS $$
  SELECT per_day
  FROM public.plan_limits
  WHERE plan_id = p_plan_id AND key = p_key
$$;

-- === RPC: CONSUME ============================================================
/*
  Atomically consume quota:
    - Checks per-day limit (plan-based or override)
    - On success: write ledger + increment daily counter
    - On fail: no side effects
  Unlimited: limit IS NULL or p_limit_override < 0
*/
CREATE OR REPLACE FUNCTION public.rpc_consume_quota(
  p_user_id uuid,
  p_key usage_key,
  p_amount integer DEFAULT 1,
  p_as_of timestamptz DEFAULT now(),
  p_plan_id text DEFAULT NULL,
  p_limit_override integer DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS TABLE(
  ok boolean,
  count integer,
  "limit" integer,
  remaining integer,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date := (p_as_of AT TIME ZONE 'UTC')::date;
  v_prev integer;
  v_next integer;
  v_limit integer;
  v_is_unlimited boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    p_amount := 1;
  END IF;

  -- Determine limit precedence: override > plan_limits.per_day > 0 default
  v_limit := COALESCE(p_limit_override, _quota_plan_day_limit(p_plan_id, p_key));
  v_is_unlimited := (v_limit IS NULL) OR (v_limit < 0);

  v_prev := _quota_day_count(p_user_id, p_key, v_day);
  v_next := v_prev + p_amount;

  IF NOT v_is_unlimited AND v_next > v_limit THEN
    ok := false;
    count := v_prev;
    "limit" := v_limit;
    remaining := GREATEST(0, v_limit - v_prev);
    reason := 'limit_reached';
    RETURN;
  END IF;

  -- Write ledger + increment counter
  INSERT INTO public.user_quota_ledger (user_id, key, amount, occurred_at, details)
  VALUES (p_user_id, p_key, p_amount, p_as_of, p_details);

  PERFORM public._quota_upsert_counter(p_user_id, p_key, v_day, p_amount);

  ok := true;
  count := v_next;
  "limit" := COALESCE(v_limit, -1); -- -1 denotes unlimited in response
  remaining := CASE WHEN v_is_unlimited THEN -1 ELSE (v_limit - v_next) END;
  reason := NULL;
  RETURN;
END$$;

-- Grant execute to authenticated users; plan_limits remains service-managed
REVOKE ALL ON FUNCTION public.rpc_consume_quota(uuid, usage_key, integer, timestamptz, text, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_consume_quota(uuid, usage_key, integer, timestamptz, text, integer, jsonb) TO authenticated, service_role;

-- === RPC: SNAPSHOT (MONTH) ===================================================
/*
  Returns per-key month-to-date totals and today count for UI badges.
  - p_month: first day of month (UTC); defaults to current month.
*/
CREATE OR REPLACE FUNCTION public.rpc_get_quota_snapshot(
  p_user_id uuid,
  p_month date DEFAULT (date_trunc('month', now() AT TIME ZONE 'UTC'))::date
)
RETURNS TABLE(
  key usage_key,
  month date,
  today date,
  month_total integer,
  today_count integer,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT p_month::date AS month_start,
           (p_month + INTERVAL '1 month')::date AS month_end,
           (now() AT TIME ZONE 'UTC')::date AS today_date
  ),
  month_agg AS (
    SELECT l.key,
           SUM(l.amount)::int AS month_total,
           MIN(l.occurred_at) AS first_seen,
           MAX(l.occurred_at) AS last_seen
    FROM public.user_quota_ledger l, bounds b
    WHERE l.user_id = p_user_id
      AND l.occurred_at >= b.month_start
      AND l.occurred_at <  b.month_end
    GROUP BY l.key
  ),
  today_agg AS (
    SELECT c.key, c.count::int AS today_count
    FROM public.user_quota_counters c, bounds b
    WHERE c.user_id = p_user_id
      AND c.day_date = b.today_date
  ),
  keys AS (
    -- union of keys used this month or today, so empty keys won't appear
    SELECT key FROM month_agg
    UNION
    SELECT key FROM today_agg
  )
  SELECT
    k.key,
    (SELECT month_start FROM bounds) AS month,
    (SELECT today_date FROM bounds) AS today,
    COALESCE(m.month_total, 0) AS month_total,
    COALESCE(t.today_count, 0) AS today_count,
    m.first_seen,
    m.last_seen
  FROM keys k
  LEFT JOIN month_agg m USING (key)
  LEFT JOIN today_agg t USING (key)
$$;

REVOKE ALL ON FUNCTION public.rpc_get_quota_snapshot(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_quota_snapshot(uuid, date) TO authenticated, service_role;

-- === OPTIONAL SEED (no-op if rows exist) =====================================
-- Example plan rows for reference (skip if already present)
INSERT INTO public.plan_limits (plan_id, key, per_day, per_month)
SELECT * FROM (VALUES
  ('free',    'ai.writing.grade'::usage_key, 3, NULL),
  ('free',    'ai.speaking.grade'::usage_key, 1, NULL),
  ('free',    'mock.start'::usage_key, 1, NULL),
  ('starter', 'ai.writing.grade'::usage_key, 10, NULL),
  ('starter', 'ai.speaking.grade'::usage_key, 5, NULL),
  ('starter', 'mock.start'::usage_key, 3, NULL)
) v(plan_id, key, per_day, per_month)
WHERE NOT EXISTS (SELECT 1 FROM public.plan_limits pl WHERE pl.plan_id = v.plan_id AND pl.key = v.key);
