import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function actionHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { suggestionId, userId = null } = req.body ?? {};
  try {
    await supabase.from('ai_actions').insert([{ user_id: userId, suggestion_id: suggestionId, created_at: new Date().toISOString() }]);
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error('ai action insert', e);
    return res.status(500).json({ error: 'Failed to record action' });
  }
}
