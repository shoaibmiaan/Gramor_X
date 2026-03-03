import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

function isAuthorized(req: NextApiRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const token = req.headers.authorization?.replace('Bearer ', '');
  return token === expected;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Rule 1: multiple failed logins per user in 24h.
    const { data: failedLogins } = await supabaseAdmin
      .from('audit_logs')
      .select('user_id,created_at,metadata')
      .eq('action', 'login_failed')
      .gte('created_at', since)
      .not('user_id', 'is', null);

    const failuresByUser = new Map<string, number>();
    for (const row of failedLogins ?? []) {
      const uid = String((row as any).user_id);
      failuresByUser.set(uid, (failuresByUser.get(uid) ?? 0) + 1);
    }

    const failAlerts = Array.from(failuresByUser.entries())
      .filter(([, count]) => count >= 10)
      .map(([userId, count]) => ({
        type: 'failed_login_spike',
        severity: count >= 20 ? 'critical' : 'high',
        user_id: userId,
        details: { count_24h: count, threshold: 10 },
      }));

    // Rule 2: repeated usage limit exceeded
    const { data: limitHits } = await supabaseAdmin
      .from('audit_logs')
      .select('user_id')
      .eq('action', 'usage_limit_exceeded')
      .gte('created_at', since)
      .not('user_id', 'is', null);

    const limitsByUser = new Map<string, number>();
    for (const row of limitHits ?? []) {
      const uid = String((row as any).user_id);
      limitsByUser.set(uid, (limitsByUser.get(uid) ?? 0) + 1);
    }

    const usageAlerts = Array.from(limitsByUser.entries())
      .filter(([, count]) => count >= 15)
      .map(([userId, count]) => ({
        type: 'usage_limit_exceeded_spike',
        severity: count >= 40 ? 'critical' : 'medium',
        user_id: userId,
        details: { count_24h: count, threshold: 15 },
      }));

    const alerts = [...failAlerts, ...usageAlerts];

    if (alerts.length > 0) {
      await supabaseAdmin.from('alerts').insert(alerts);
    }

    return res.status(200).json({ ok: true, inserted: alerts.length, since });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
