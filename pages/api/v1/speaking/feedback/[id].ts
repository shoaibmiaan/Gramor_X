import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { supabaseService } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const id = String(req.query.id ?? '');
  if (!id) return res.status(400).json({ error: 'missing_id' });

  const db = supabaseService() as any;
  const { data } = await db.from('speaking_attempts').select('id, user_id, metrics, feedback, created_at').eq('id', id).maybeSingle();

  if (!data || data.user_id !== auth.userId) return res.status(404).json({ error: 'not_found' });
  return res.status(200).json({ feedback: data });
}
