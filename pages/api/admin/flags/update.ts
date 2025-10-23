// pages/api/admin/flags/update.ts
// Admin endpoint to toggle runtime feature flags.

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { invalidateFlagCache, resolveFlags } from '@/lib/flags';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  audience: z
    .object({
      plans: z.array(z.enum(['free', 'starter', 'booster', 'master'])).optional(),
      roles: z.array(z.string().min(1)).optional(),
      percentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Flag store unavailable' });
    return;
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
    return;
  }

  const { key, enabled, audience } = parsed.data;

  const { error } = await supabaseAdmin
    .from('feature_flags')
    .upsert({
      key,
      enabled,
      audience: audience ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    res.status(500).json({ error: 'Failed to update flag', detail: error.message });
    return;
  }

  invalidateFlagCache();
  const snapshot = await resolveFlags(ctx.audience);

  res.status(200).json({ ok: true, flag: key, enabled, flags: snapshot });
}

export default withPlan('master', handler, { allowRoles: ['admin'] });

