import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { rateLimit } from '@/lib/rateLimit';
import { getServerClient } from '@/lib/supabaseServer';
import {
  calcCohesionDensity,
  calcOriginalityScore,
  calcTtr,
  calcTemplateOveruse,
  calcWpm,
  countHedgingPhrases,
  mergeIntegrityFlags,
} from '@/lib/writing/metrics';

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
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/metrics/compute', { requestId, clientIp });

  if (!(await rateLimit(req, res))) {
    logger.warn('rate limit triggered on metrics');
    return;
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid metrics payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const { attemptId, draftText, wordCount, timeSpentMs } = parsed.data;

  const ttr = calcTtr(draftText);
  const wpm = calcWpm(wordCount, timeSpentMs);
  const cohesionDensity = calcCohesionDensity(draftText);
  const templateOveruse = calcTemplateOveruse(draftText);
  const originalityScore = calcOriginalityScore(draftText);
  const hedgingCounts = countHedgingPhrases(draftText);
  const totalHedges = Object.values(hedgingCounts).reduce((sum, value) => sum + value, 0);
  const hedgingDensity = Math.round(Math.min(totalHedges / Math.max(wordCount / 120, 1), 1) * 100) / 100;

  const { error: upsertError } = await supabase
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

  if (upsertError) {
    logger.error('failed to upsert metrics', { error: upsertError.message, attemptId });
    return res.status(500).json({ error: upsertError.message });
  }

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('integrity_flags')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt integrity flags', { error: loadError.message, attemptId });
    return res.status(500).json({ error: loadError.message });
  }

  const integrityFlags = mergeIntegrityFlags(attemptRow?.integrity_flags, {
    templateOveruse,
    originality: originalityScore,
    hedgingDensity,
  });

  const { error: integrityError } = await supabase
    .from('writing_attempts')
    .update({ integrity_flags: integrityFlags })
    .eq('id', attemptId);

  if (integrityError) {
    logger.error('failed to update integrity flags', { error: integrityError.message, attemptId });
    return res.status(500).json({ error: integrityError.message });
  }

  logger.info('metrics computed', { attemptId, wpm, ttr, cohesionDensity, templateOveruse, originalityScore, hedgingDensity });
  await trackor.log('writing_attempt_metrics', {
    attempt_id: attemptId,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ ok: true });
}
