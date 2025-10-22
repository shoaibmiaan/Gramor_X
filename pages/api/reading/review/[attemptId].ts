import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { attemptId } = req.query as { attemptId?: string };
  if (!attemptId) return res.status(400).json({ error: 'Missing attemptId' });

  const { data: attempts, error: attemptErr } = await supabaseAdmin
    .from('reading_responses')
    .select('id, passage_slug, band, correct_count, total_questions, result_json')
    .eq('id', attemptId)
    .limit(1);

  if (attemptErr) {
    return res.status(500).json({ error: attemptErr.message || 'Failed to load attempt' });
  }

  const attempt = attempts?.[0];
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const { data: passages, error: passageErr } = await supabaseAdmin
    .from('reading_passages')
    .select('title')
    .eq('slug', attempt.passage_slug)
    .limit(1);

  if (passageErr) {
    return res.status(500).json({ error: passageErr.message || 'Failed to load passage' });
  }

  const title = passages?.[0]?.title ?? attempt.passage_slug;
  const resultJson = (attempt.result_json as any) ?? {};
  const summary = resultJson.summary ?? {};

  return res.status(200).json({
    attemptId: attempt.id,
    title,
    band: typeof attempt.band === 'number' ? attempt.band : Number(attempt.band ?? 0),
    correctCount: attempt.correct_count ?? summary.correctCount ?? 0,
    total: attempt.total_questions ?? summary.totalQuestions ?? 0,
    items: Array.isArray(resultJson.items) ? resultJson.items : [],
    breakdown: resultJson.breakdown ?? null,
    difficultyBreakdown: resultJson.difficultyBreakdown ?? null,
  });
}
