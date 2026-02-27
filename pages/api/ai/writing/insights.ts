// pages/api/ai/writing/insights.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/plan/withPlan';
import { getInsights, InsightsSchema } from '@/lib/ai/writing/insightsAdapter';
import { isQuotaBypassed } from '@/lib/usage/bypass';
import { resolveUserPlan } from '@/lib/plan/resolveUserPlan';
// Signature assumption: checkQuota(supabase, userId, key) -> { ok: boolean; remaining?: number; reason?: string; resetAt?: string }
import { checkQuota } from '@/lib/usage/checkQuota';

type Ok = z.infer<typeof InsightsSchema>;
type Err = { error: string; details?: unknown; remaining?: number | null; resetAt?: string | null };

async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // role + plan (for quota bypass & analytics)
  const [{ data: prof }, planId] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    resolveUserPlan(supabase, user.id).catch(() => null),
  ]);
  const role = (prof?.role as string) ?? null;
  const plan = (planId as any) ?? null;

  // Admin bypasses quota entirely
  if (!isQuotaBypassed({ role, plan })) {
    // Enforce daily quota per plan, but NEVER 500 if quota service fails
    try {
      const resq = await checkQuota(supabase, user.id, 'ai.writing.insights');
      if (!resq?.ok) {
        return res.status(429).json({
          error: 'Quota exceeded for AI Insights',
          details: resq?.reason ?? 'limit_reached',
          remaining: resq?.remaining ?? 0,
          resetAt: (resq as any)?.resetAt ?? null,
        });
      }
    } catch (err: any) {
      // Fail-open to avoid blocking users during quota-service hiccups
      // console.warn('[quota] checkQuota failed; allowing request', err?.message ?? err);
    }
  }

  try {
    const data = await getInsights(user.id);
    const parsed = InsightsSchema.parse(data);
    return res.status(200).json(parsed);
  } catch (e: any) {
    // Log if you want: console.error('[ai/writing/insights] error', e);
    return res.status(500).json({ error: 'Failed to compute insights', details: e?.message ?? e });
  }
}

// Keep plan gate at Starter+; admins/teachers bypass via allowRoles
export default withPlan('free', handler, { allowRoles: ['admin', 'teacher'] });
