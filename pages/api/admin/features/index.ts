import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '@/lib/requireRole';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { data, error } = await supabaseAdmin
    .from('feature_flags')
    .select('key,enabled,audience,updated_at')
    .order('key', { ascending: true });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(200).json({ ok: true, flags: data ?? [] });
}
