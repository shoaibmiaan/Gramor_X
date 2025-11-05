import type { NextApiRequest, NextApiResponse } from 'next';

export default async function sessionIdHandler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (req.method === 'GET') {
    const { data, error } = await SUPABASE.from('study_sessions').select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // support /start via POST to this route with /start in path
    const path = req.url ?? '';
    if (path.endsWith('/start')) {
      try {
        const { error } = await SUPABASE.from('study_sessions').update({ state: 'started', updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        const { data } = await SUPABASE.from('study_sessions').select('*').eq('id', id).maybeSingle();
        return res.status(200).json(data);
      } catch (e: any) {
        return res.status(500).json({ error: e?.message ?? 'Failed to start session' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
