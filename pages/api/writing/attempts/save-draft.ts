import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getRequestId } from '@/lib/api/requestContext';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { SaveDraftBody } from '@/lib/writing/schemas';

type Data = { ok: true; throttled?: boolean } | { error: string; details?: unknown };

const MIN_SAVE_INTERVAL_MS = 4_000;

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const logger = createRequestLogger('api/writing/attempts/save-draft', { requestId });
  const startedAt = Date.now();

  const parsed = SaveDraftBody.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('invalid payload', { issues: parsed.error.flatten(), requestId });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised draft save', { requestId });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attemptId, draftText, wordCount, timeSpentMs } = parsed.data;

  const { data: attemptRow, error: loadError } = await supabase
    .from('writing_attempts')
    .select('user_id, status, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    logger.error('failed to load attempt before saving draft', { error: loadError.message, attemptId, userId: user.id, requestId });
    return res.status(500).json({ error: loadError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for draft save', { attemptId, userId: user.id, requestId });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  if (attemptRow.user_id !== user.id) {
    logger.warn('draft save forbidden', { attemptId, userId: user.id, requestId });
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

  const { error } = await supabase
    .from('writing_attempts')
    .update({
      draft_text: draftText,
      word_count: wordCount,
      time_spent_ms: timeSpentMs,
    })
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .eq('status', 'draft');

  if (error) {
    logger.error('draft save failed', { error: error.message, attemptId, userId: user.id, requestId });
    return res.status(500).json({ error: error.message });
  }

  logger.info('draft saved', { attemptId, userId: user.id, latencyMs: Date.now() - startedAt, wordCount });
  return res.status(200).json({ ok: true });
}

export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
