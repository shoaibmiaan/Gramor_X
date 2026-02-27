import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Query = z.object({
  code: z.string().trim(),
  planId: z.enum(['free','starter','booster','master'])
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const parse = Query.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: 'Invalid query', details: parse.error.flatten() });

  const { code, planId } = parse.data;
  const supabase = getServerClient(req, res);

  const { data: rc } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (!rc || rc.status !== 'active') return res.status(200).json({ valid: false });

  if (rc.expires_at && new Date(rc.expires_at) < new Date()) return res.status(200).json({ valid: false });
  if (rc.max_uses && (rc.uses ?? 0) >= rc.max_uses) return res.status(200).json({ valid: false });
  if (rc.allowed_plans?.length && !rc.allowed_plans.includes(planId)) return res.status(200).json({ valid: false });

  // Return a simple preview benefit (e.g., fixed credit  — decide in Step 2)
  return res.status(200).json({ valid: true, credit_cents: 0, currency: 'USD' });
}
