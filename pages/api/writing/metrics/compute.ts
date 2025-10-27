import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { calcTtr, calcWpm } from '@/lib/writing/metrics';

const Body = z.object({
  attemptId: z.string().uuid(),
  draftText: z.string(),
  wordCount: z.number().int().nonnegative(),
  timeSpentMs: z.number().int().nonnegative(),
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
  const { attemptId, draftText, wordCount, timeSpentMs } = parsed.data;

  const ttr = calcTtr(draftText);
  const wpm = calcWpm(wordCount, timeSpentMs);

  const { error } = await supabase
    .from('writing_metrics')
    .upsert(
      {
        attempt_id: attemptId,
        ttr,
        wpm,
        cohesion_density: null,
        template_overuse: null,
        originality_score: null,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id' },
    );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
