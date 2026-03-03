import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { supabaseService } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const db = supabaseService() as any;
  const [scores, profile] = await Promise.all([
    db.from('score_history').select('band, category, occurred_at').eq('user_id', auth.userId).order('occurred_at', { ascending: false }).limit(30),
    db.from('user_skill_profiles').select('proficiency, weakness_tags, learning_pace').eq('user_id', auth.userId).maybeSingle(),
  ]);

  return res.status(200).json({ history: scores.data ?? [], skillProfile: profile.data ?? null });
}
