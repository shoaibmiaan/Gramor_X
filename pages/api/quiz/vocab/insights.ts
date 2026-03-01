import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { getVocabInsights, type VocabInsights } from '@/lib/services/vocabQuizService';

type ErrorPayload = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VocabInsights | ErrorPayload>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const payload = await getVocabInsights(supabase, user.id);
  return res.status(200).json(payload);
}
