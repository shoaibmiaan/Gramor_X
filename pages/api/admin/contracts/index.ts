import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '@/lib/requireRole';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await requireRole(req, ['admin']);
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const { userId } = req.query as { userId?: string };
    let query = supabaseAdmin
      .from('contracts')
      .select('id,user_id,file_url,start_date,end_date,terms,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, contracts: data ?? [] });
  }

  if (req.method === 'POST') {
    const { user_id, file_url, start_date, end_date, terms } = req.body ?? {};
    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({ ok: false, error: 'user_id, start_date and end_date are required' });
    }

    const { error } = await supabaseAdmin.from('contracts').insert({
      user_id,
      file_url: file_url ?? null,
      start_date,
      end_date,
      terms: terms ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
