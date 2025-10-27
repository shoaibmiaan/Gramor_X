// pages/api/admin/health.ts
// Admin health endpoint verifying external dependencies.

import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { redis } from '@/lib/redis';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSloSnapshot } from '@/lib/obs/slo';

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

async function handler(_req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  const status: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const pingKey = `health:pulse:${Date.now()}`;
    await redis.incr(pingKey);
    await redis.expire(pingKey, 2);
    status.redis = { ok: true };
  } catch (error) {
    status.redis = { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }

  try {
    const { error } = await ctx.supabase
      .from('profiles')
      .select('id')
      .eq('id', ctx.user.id)
      .limit(1);
    status.supabase = { ok: !error, detail: error?.message };
  } catch (error) {
    status.supabase = { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }

  if (supabaseAdmin) {
    status.supabaseAdmin = { ok: true };
  } else {
    status.supabaseAdmin = { ok: false, detail: 'service client not configured' };
  }

  const missingEnv = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  status.env = { ok: missingEnv.length === 0, detail: missingEnv.join(', ') || undefined };

  const slo = getSloSnapshot();

  res.status(200).json({ ok: true, status, slo });
}

export default withPlan('master', handler, { allowRoles: ['admin'] });

