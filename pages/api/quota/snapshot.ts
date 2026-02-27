// pages/api/quota/snapshot.ts
// GET -> returns month-to-date snapshot per usage key for the current user.
// Optional query: ?month=YYYY-MM (UTC month)

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

function parseMonthParam(input?: string | string[]) {
  if (!input) return null;
  const raw = Array.isArray(input) ? input[0] : input;
  const m = /^\d{4}-\d{2}$/.exec(raw || '');
  if (!m) return null;
  const [yearStr, monthStr] = raw.split('-');
  const y = Number(yearStr);
  const mm = Number(monthStr);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
  // First day of given month (UTC)
  return new Date(Date.UTC(y, mm - 1, 1)).toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return res.status(500).json({ error: authError.message });
  }
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const monthIso = parseMonthParam(req.query.month);
    const rpcArgs: Record<string, unknown> = { p_user_id: user.id };
    if (monthIso) rpcArgs.p_month = monthIso;

    const { data, error } = await supabase.rpc('rpc_get_quota_snapshot', rpcArgs);
    if (error) {
      console.error('[quota/snapshot] rpc_get_quota_snapshot failed', error);
      return res.status(500).json({ error: 'Failed to load snapshot' });
    }

    return res.status(200).json({
      ok: true,
      month: monthIso ?? null,
      snapshot: Array.isArray(data) ? data : [],
    });
  } catch (e: any) {
    console.error('[quota/snapshot] error', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
