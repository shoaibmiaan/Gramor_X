import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { rateLimit } from '@/lib/rateLimit';
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

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/metrics/compute', { requestId });

  if (!(await rateLimit(req, res))) {
    logger.warn('rate limit triggered on metrics', { requestId });
    return;
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid metrics payload', { issues: parsed.error.flatten(), requestId });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { attemptId, draftText, wordCount, timeSpentMs } = parsed.data;

  const tokens = draftText
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const ttr = calcTtr(draftText);
  const wpm = calcWpm(wordCount, timeSpentMs);

  const cohesionMarkers = new Set([
    'however',
    'moreover',
    'therefore',
    'furthermore',
    'consequently',
    'additionally',
    'similarly',
    'nonetheless',
    'nevertheless',
    'meanwhile',
    'likewise',
    'instead',
  ]);

  const cohesiveCount = tokens.filter((token) => cohesionMarkers.has(token.replace(/\s+/g, ''))).length;
  const sentences = draftText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const cohesionDensity = Math.round((cohesiveCount / Math.max(1, sentences.length)) * 100) / 100;

  const bigramCounts = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const bigram = `${tokens[i]} ${tokens[i + 1]}`;
    bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
  }
  const repeatedBigrams = Array.from(bigramCounts.values()).filter((value) => value > 1).length;
  const templateOveruse = Math.round((repeatedBigrams / Math.max(1, tokens.length - 1)) * 100) / 100;

  const uniqueSentences = new Set(sentences.map((sentence) => sentence.toLowerCase()));
  const originalityScore = Math.round((uniqueSentences.size / Math.max(1, sentences.length)) * 100) / 100;

  const { error } = await supabase
    .from('writing_metrics')
    .upsert(
      {
        attempt_id: attemptId,
        ttr,
        wpm,
        cohesion_density: cohesionDensity,
        template_overuse: templateOveruse,
        originality_score: originalityScore,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id' },
    );

  if (error) {
    logger.error('failed to upsert metrics', { error: error.message, attemptId, requestId });
    return res.status(500).json({ error: error.message });
  }

  logger.info('metrics computed', { attemptId, requestId, wpm, ttr, cohesionDensity, templateOveruse, originalityScore });
  return res.status(200).json({ ok: true });
}
