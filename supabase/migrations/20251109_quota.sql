-- 1) Type: what we're limiting
DO $$ BEGIN
  CREATE TYPE quota_item AS ENUM ('ai_writing_eval', 'mock_test', 'speaking_session');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Plan limits (normalized plans from your rules: free | starter | booster | master)
CREATE TABLE IF NOT EXISTS plan_limits (
  plan text PRIMARY KEY,
  ai_writing_eval_limit integer NOT NULL,
  mock_test_limit integer NOT NULL,
  speaking_session_limit integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- seed defaults; adjust anytime
INSERT INTO plan_limits(plan, ai_writing_eval_limit, mock_test_limit, speaking_session_limit)
VALUES
  ('free',    5,   2,  3),
  ('starter', 50,  8,  12),
  ('booster', 200, 20, 32),
  ('master',  999999, 999999, 999999) -- effectively unlimited
ON CONFLICT (plan) DO NOTHING;

-- 3) Per-user monthly counters (one row per month-window)
CREATE TABLE IF NOT EXISTS user_quota_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL, -- first day of month (UTC)
  ai_writing_eval_used integer NOT NULL DEFAULT 0,
  mock_test_used integer NOT NULL DEFAULT 0,
  speaking_session_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_month)
);

-- 4) Ledger for audit (optional but recommended)
CREATE TABLE IF NOT EXISTS user_quota_ledger (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  item quota_item NOT NULL,
  delta integer NOT NULL, -- +1 consume, -1 refund, etc.
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Helper: month-start for "now"
CREATE OR REPLACE FUNCTION month_floor(ts timestamptz)
RETURNS date
LANGUAGE sql IMMUTABLE AS $$
  SELECT date_trunc('month', ts)::date;
$$;

-- 6) Get current plan for user. Replace this logic if you store plan elsewhere.
-- Expect a profiles table or subscriptions table; here is a safe placeholder:
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id uuid)
RETURNS text
LANGUAGE sql STABLE AS $$
  -- Try from profiles.plan; fallback to 'free'
  SELECT COALESCE(
    (SELECT lower(btrim(p.plan)) FROM public.profiles p WHERE p.id = p_user_id),
    'free'
  );
$$;

-- 7) Upsert counter row for current month
CREATE OR REPLACE FUNCTION ensure_quota_row(p_user_id uuid, p_month date)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_quota_counters(user_id, period_month)
  VALUES (p_user_id, p_month)
  ON CONFLICT (user_id, period_month) DO NOTHING;
END;
$$;

-- 8) Limits by plan -> struct return
CREATE TYPE quota_limits AS (
  ai_writing_eval_limit integer,
  mock_test_limit integer,
  speaking_session_limit integer
);

CREATE OR REPLACE FUNCTION limits_for_user(p_user_id uuid)
RETURNS quota_limits
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_plan text;
  v_limits plan_limits%ROWTYPE;
BEGIN
  v_plan := get_user_plan(p_user_id);
  SELECT * INTO v_limits FROM plan_limits WHERE plan = v_plan;
  IF NOT FOUND THEN
    -- default to free
    SELECT * INTO v_limits FROM plan_limits WHERE plan = 'free';
  END IF;
  RETURN (v_limits.ai_writing_eval_limit, v_limits.mock_test_limit, v_limits.speaking_session_limit);
END;
$$;

-- 9) RPC: check & consume (atomic)
CREATE OR REPLACE FUNCTION rpc_consume_quota(
  p_user_id uuid,
  p_item quota_item,
  p_amount integer DEFAULT 1,
  p_reason text DEFAULT 'consume'
)
RETURNS TABLE(
  ok boolean,
  remaining integer,
  limit integer,
  used integer,
  period_month date
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month date := month_floor(now());
  v_limits quota_limits;
  v_limit integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be > 0';
  END IF;

  PERFORM ensure_quota_row(p_user_id, v_month);
  v_limits := limits_for_user(p_user_id);

  IF p_item = 'ai_writing_eval' THEN
    v_limit := v_limits.ai_writing_eval_limit;
    UPDATE user_quota_counters
    SET ai_writing_eval_used = ai_writing_eval_used + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_month = v_month
      AND ai_writing_eval_used + p_amount <= v_limit
    RETURNING ai_writing_eval_used AS used INTO used;

    IF NOT FOUND THEN
      SELECT ai_writing_eval_used INTO used FROM user_quota_counters
      WHERE user_id = p_user_id AND period_month = v_month;
      RETURN QUERY SELECT false, GREATEST(v_limit - used, 0), v_limit, used, v_month;
      RETURN;
    END IF;

    INSERT INTO user_quota_ledger(user_id, period_month, item, delta, reason)
    VALUES(p_user_id, v_month, p_item, p_amount, p_reason);

    RETURN QUERY SELECT true, (v_limit - used), v_limit, used, v_month;

  ELSIF p_item = 'mock_test' THEN
    v_limit := v_limits.mock_test_limit;
    UPDATE user_quota_counters
    SET mock_test_used = mock_test_used + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_month = v_month
      AND mock_test_used + p_amount <= v_limit
    RETURNING mock_test_used AS used INTO used;

    IF NOT FOUND THEN
      SELECT mock_test_used INTO used FROM user_quota_counters
      WHERE user_id = p_user_id AND period_month = v_month;
      RETURN QUERY SELECT false, GREATEST(v_limit - used, 0), v_limit, used, v_month;
      RETURN;
    END IF;

    INSERT INTO user_quota_ledger(user_id, period_month, item, delta, reason)
    VALUES(p_user_id, v_month, p_item, p_amount, p_reason);

    RETURN QUERY SELECT true, (v_limit - used), v_limit, used, v_month;

  ELSE -- speaking_session
    v_limit := v_limits.speaking_session_limit;
    UPDATE user_quota_counters
    SET speaking_session_used = speaking_session_used + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id AND period_month = v_month
      AND speaking_session_used + p_amount <= v_limit
    RETURNING speaking_session_used AS used INTO used;

    IF NOT FOUND THEN
      SELECT speaking_session_used INTO used FROM user_quota_counters
      WHERE user_id = p_user_id AND period_month = v_month;
      RETURN QUERY SELECT false, GREATEST(v_limit - used, 0), v_limit, used, v_month;
      RETURN;
    END IF;

    INSERT INTO user_quota_ledger(user_id, period_month, item, delta, reason)
    VALUES(p_user_id, v_month, p_item, p_amount, p_reason);

    RETURN QUERY SELECT true, (v_limit - used), v_limit, used, v_month;
  END IF;
END;
$$;

-- 10) RPC: read current usage/limits (for UI)
CREATE OR REPLACE FUNCTION rpc_get_quota_snapshot(p_user_id uuid)
RETURNS TABLE(
  period_month date,
  ai_writing_eval_used integer,
  ai_writing_eval_limit integer,
  mock_test_used integer,
  mock_test_limit integer,
  speaking_session_used integer,
  speaking_session_limit integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_month date := month_floor(now());
  v_limits quota_limits;
  v_row user_quota_counters%ROWTYPE;
BEGIN
  PERFORM ensure_quota_row(p_user_id, v_month);
  v_limits := limits_for_user(p_user_id);
  SELECT * INTO v_row FROM user_quota_counters WHERE user_id = p_user_id AND period_month = v_month;

  RETURN QUERY SELECT
    v_month,
    v_row.ai_writing_eval_used, v_limits.ai_writing_eval_limit,
    v_row.mock_test_used, v_limits.mock_test_limit,
    v_row.speaking_session_used, v_limits.speaking_session_limit;
END;
$$;

-- 11) RLS
ALTER TABLE user_quota_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quota_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- Only the user sees their counters/ledger
DO $$ BEGIN
  CREATE POLICY sel_own_counters ON user_quota_counters
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY mod_own_counters ON user_quota_counters
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sel_own_ledger ON user_quota_ledger
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only admins can read/update plan_limits (adjust role id if you have an admin role table)
DO $$ BEGIN
  CREATE POLICY sel_plan_limits ON plan_limits
    FOR SELECT USING (true); -- readable by all if you want to surface plan info
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12) Expose RPC via PostgREST (Supabase does this automatically for functions in public schema)
