// pages/api/ai/writing/explain.ts
// Returns a short explanation for a specific scoring criterion.

import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { explainCriterion, scoreEssay } from '@/lib/writing/scoring';
import { writingExplainRequestSchema } from '@/lib/validation/writing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = writingExplainRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.flatten() });
  }

  const { task, essay, criterion, wordTarget } = parsed.data;
  const score = scoreEssay({ essay, task, wordTarget });
  const explanation = explainCriterion(criterion, { essay, task, wordTarget });

  return res.status(200).json({
    ok: true,
    band: explanation.band,
    explanation: explanation.explanation,
    score,
  });
}
