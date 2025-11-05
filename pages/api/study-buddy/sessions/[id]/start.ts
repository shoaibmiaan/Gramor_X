// pages/api/study-buddy/sessions/[id]/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin'; // full server admin client

export default async function startSessionHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id?: string };

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'missing_id' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('study_sessions')
      .update({ state: 'started', updated_at: now })
      .eq('id', id)
      .order('id', { ascending: true }) // 🧠 add explicit order
      .select('*')
      .maybeSingle(); // ✅ no implicit limit

    if (error) {
      console.error('[study-sessions/start] supabase error', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'session_not_found' });
    }

    return res.status(200).json({ ok: true, session: data });
  } catch (err: any) {
    console.error('[study-sessions/start] exception', err);
    return res.status(500).json({ error: err?.message ?? 'unexpected_error' });
  }
}
