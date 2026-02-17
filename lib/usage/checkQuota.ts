// lib/usage/checkQuota.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import type { PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabaseServer';

export type QuotaResult = { ok: true } | { ok: false; reason: string };

const TEACHER_BYPASS =
  (process.env.GX_TEACHER_QUOTA_BYPASS ?? process.env.NEXT_PUBLIC_TEACHER_QUOTA_BYPASS) === 'true';

/**
 * Check per-user quota for a usage `key`, with role bypass (admin, optional teacher).
 * Strategy (in order):
 *  1) Bypass for admin (and teacher if enabled).
 *  2) get_user_plan(user) → plan_limits(plan_id,key) → get_usage_today(user,key) → compare (fail-closed).
 *  3) Legacy fallback: usage_check(user,key) (fail-open if RPC missing/shape unexpected).
 *  4) Any transport/infra issue: fail-open (ok: true) so APIs don’t 500.
 */
export async function checkQuota(
  req: NextApiRequest,
  res: NextApiResponse,
  key: string
): Promise<QuotaResult> {
  try {
    const supabase = getServerClient(req, res);

    // ---- auth ----
    const { data: userWrap } = await supabase.auth.getUser();
    const user = userWrap?.user;
    if (!user) return { ok: false, reason: 'unauthorized' };

    // ---- role bypass ----
    const roleRow = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = roleRow.data?.role ?? 'student';
    if (role === 'admin') return { ok: true };
    if (TEACHER_BYPASS && role === 'teacher') return { ok: true };

    // ---- modern plan/usage path ----
    // get_user_plan(uuid) → { plan_id text }
    const planRes = await safeRpcSingle(supabase, 'get_user_plan', { p_user_id: user.id });
    const planId: string = (planRes?.data as any)?.plan_id ?? 'free';

    // plan_limits(plan_id,key) → per_day, per_month (nullable)
    const limitRes = await supabase
      .from('plan_limits')
      .select('per_day, per_month')
      .eq('plan_id', planId)
      .eq('key', key)
      .maybeSingle();

    // If plan_limits not configured for this key, allow by default.
    const perDay: number | null = coerceNumber(limitRes.data?.per_day);
    const perMonth: number | null = coerceNumber(limitRes.data?.per_month);

    if (perDay !== null || perMonth !== null) {
      // get_usage_today(uuid,key) → { count int }
      const usageTodayRes = await safeRpcSingle(supabase, 'get_usage_today', {
        p_user_id: user.id,
        p_key: key,
      });
      const usedToday = coerceNumber((usageTodayRes?.data as any)?.count) ?? 0;

      if (perDay !== null && usedToday >= perDay) {
        return { ok: false, reason: 'daily_quota_exhausted' };
      }

      // Optional: monthly check if you add get_usage_month RPC; otherwise skip.
      // If you already have get_usage_month, uncomment below:
      // const usageMonthRes = await safeRpcSingle(supabase, 'get_usage_month', { p_user_id: user.id, p_key: key });
      // const usedMonth = coerceNumber((usageMonthRes?.data as any)?.count) ?? 0;
      // if (perMonth !== null && usedMonth >= perMonth) {
      //   return { ok: false, reason: 'monthly_quota_exhausted' };
      // }

      return { ok: true };
    }

    // ---- legacy fallback: usage_check(uuid,key) → { ok, remaining?, reason?, reset_at? }
    const legacy = await safeRpcSingle(supabase, 'usage_check', {
      p_user_id: user.id,
      p_key: key,
    });

    const legacyOk = typeof (legacy?.data as any)?.ok === 'boolean' ? (legacy!.data as any).ok : true;
    if (!legacyOk) {
      const reason = (legacy?.data as any)?.reason || 'quota_exhausted';
      return { ok: false, reason };
    }
    return { ok: true };
  } catch {
    // Fail-open by design to avoid user-facing errors due to infra/transient issues.
    return { ok: true };
  }
}

/* --------------------------------- helpers -------------------------------- */

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function safeRpcSingle(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown>
): Promise<PostgrestSingleResponse<any> | null> {
  try {
    const rpcFn = (supabase as any).rpc?.bind?.(supabase);
    if (!rpcFn) return null;
    // @ts-expect-error – supabase typings for rpc don’t map dynamic fn names well; revisit if SDK updates.
    const res: PostgrestSingleResponse<any> = await rpcFn(fn, args).single();
    if ((res as any)?.error) return null;
    return res;
  } catch {
    return null;
  }
}

export default checkQuota;
