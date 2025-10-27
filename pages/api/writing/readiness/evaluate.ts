import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getServerClient } from '@/lib/supabaseServer';

type Data = { pass: boolean; missing: string[] } | { error: string };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('writing_drill_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('completed_at', since);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const total = count ?? 0;
  const pass = total >= 2;
  const missing = pass ? [] : ['Complete 2 targeted micro-drills in the last 7 days'];

  return res.status(200).json({ pass, missing });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
