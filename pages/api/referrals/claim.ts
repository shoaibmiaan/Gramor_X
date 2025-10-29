import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/withPlan';

const Body = z.object({
  code: z.string().min(6).max(12),
  deviceHash: z.string().min(16),
  ipHash: z.string().min(16).optional(),
});

type Resp = { ok: true } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { code, deviceHash, ipHash } = parse.data;

  const { error } = await supabase.rpc('referrals_claim', {
    p_code: code,
    p_device_hash: deviceHash,
    p_ip_hash: ipHash ?? null,
  });

  if (error) return res.status(400).json({ error: error.message, details: error });
  return res.status(200).json({ ok: true });
}

export default withPlan('free', handler, { allowRoles: ['admin', 'teacher'] });
