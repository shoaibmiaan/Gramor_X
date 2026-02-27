import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { calcTemplateOveruse, countHedgingPhrases, estimatePasteBurst, mergeIntegrityFlags } from '@/lib/writing/metrics';
import { SaveDraftBody } from '@/lib/writing/schemas';

type Data = { ok: true; throttled?: boolean } | { error: string; details?: unknown };

const MIN_SAVE_INTERVAL_MS = 4_000;

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/attempts/save-draft', { requestId, clientIp });
  const startedAt = Date.now();

  const parsed = SaveDraftBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised draft save');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attemptId, draftText, wordCount, timeSpentMs } = parsed.data;

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('user_id, status, updated_at, draft_text, integrity_flags')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt before saving draft', { error: loadError.message, attemptId, userId: user.id });
    return res.status(500).json({ error: loadError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for draft save', { attemptId, userId: user.id });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attemptRow.user_id !== user.id) {
    logger.warn('draft save forbidden', { attemptId, userId: user.id });
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (attemptRow.status !== 'draft') {
    logger.info('draft save ignored for non-draft attempt', { attemptId, status: attemptRow.status, userId: user.id });
    return res.status(200).json({ ok: true, throttled: true });
  }

  const lastUpdated = attemptRow.updated_at ? Date.parse(attemptRow.updated_at as unknown as string) : 0;
  if (lastUpdated && Date.now() - lastUpdated < MIN_SAVE_INTERVAL_MS) {
    logger.debug('autosave throttled server-side', { attemptId, userId: user.id, sinceLastUpdateMs: Date.now() - lastUpdated });
    return res.status(200).json({ ok: true, throttled: true });
  }

  const pasteBurst = estimatePasteBurst(attemptRow.draft_text ?? '', draftText);
  const hedgingCounts = countHedgingPhrases(draftText);
  const totalHedges = Object.values(hedgingCounts).reduce((sum, value) => sum + value, 0);
  const hedgingDensity = Math.round(Math.min(totalHedges / Math.max(wordCount / 120, 1), 1) * 100) / 100;
  const templateOveruse = calcTemplateOveruse(draftText);

  let integrityFlags = mergeIntegrityFlags(attemptRow.integrity_flags, {
    hedgingDensity,
    templateOveruse,
  });

  if (pasteBurst) {
    integrityFlags = mergeIntegrityFlags(integrityFlags, {
      bulkPaste: { detected: true, words: pasteBurst.words, ratio: pasteBurst.ratio },
    });
  }

  const { error } = await supabase
    .from('writing_attempts')
    .update({
      draft_text: draftText,
      word_count: wordCount,
      time_spent_ms: timeSpentMs,
      integrity_flags: integrityFlags,
    })
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .eq('status', 'draft');

  if (error) {
    logger.error('draft save failed', { error: error.message, attemptId, userId: user.id });
    return res.status(500).json({ error: error.message });
  }

  const latency = Date.now() - startedAt;
  logger.info('draft saved', { attemptId, userId: user.id, latencyMs: latency, wordCount, hedgingDensity, templateOveruse });
  await trackor.log('writing_attempt_saved', {
    attempt_id: attemptId,
    user_id: user.id,
    word_count: wordCount,
    time_spent_ms: timeSpentMs,
    latency_ms: latency,
    request_id: requestId,
    ip: clientIp,
    bulk_paste_detected: pasteBurst ? 1 : 0,
  });

  return res.status(200).json({ ok: true });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
