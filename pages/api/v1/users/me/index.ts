import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { supabaseService } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const auth = await authenticateApiKey(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const db = supabaseService() as any;
  const { data: profile } = await db.from('profiles').select('id, full_name, email, target_band').eq('id', auth.userId).maybeSingle();
  return res.status(200).json({ user: profile ?? { id: auth.userId } });
}
