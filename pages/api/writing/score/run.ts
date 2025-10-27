import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { FeedbackJson, ScoresJson } from '@/lib/writing/schemas';

const Body = z.object({
  attemptId: z.string().uuid(),
  scores: ScoresJson,
  feedback: FeedbackJson.optional(),
});

type Data = { ok: true } | { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { attemptId, scores, feedback } = parsed.data;

  const { error } = await supabase
    .from('writing_attempts')
    .update({
      status: 'scored',
      overall_band: scores.overall,
      scores_json: scores,
      feedback_json: feedback ?? null,
    })
    .eq('id', attemptId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
