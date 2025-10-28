import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';
import { ReviewSubmitBody } from '@/lib/writing/schemas';

type Data = { ok: true } | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/reviews/submit', { requestId, clientIp });
  const parsed = ReviewSubmitBody.safeParse(req.body);
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
    logger.warn('unauthorised review submission');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { attemptId, role, scores, comments, audioUrl } = parsed.data;

  const [{ data: profile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
  ]);

  const { data: attemptRow, error: attemptError } = await supabase
    .from('writing_attempts')
    .select('user_id, status')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError) {
    logger.error('failed to load attempt for review submission', { error: attemptError.message, attemptId, userId: user.id });
    return res.status(500).json({ error: attemptError.message });
  }

  if (!attemptRow) {
    logger.warn('attempt not found for review submission', { attemptId, userId: user.id });
    return res.status(404).json({ error: 'Attempt not found' });
  }

  const reviewerRole = profile?.role ?? 'user';
  const isCoach = reviewerRole === 'teacher' || reviewerRole === 'admin';
  const isOwner = attemptRow.user_id === user.id;

  if (!isOwner && !isCoach && role !== 'peer') {
    logger.warn('review forbidden due to role mismatch', { attemptId, reviewerRole, requestedRole: role, userId: user.id });
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (role === 'peer' && !isOwner && !isCoach) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('writing_drill_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .contains('tags', ['CALIBRATION_PASSED'])
      .gte('completed_at', ninetyDaysAgo);

    if ((count ?? 0) === 0) {
      logger.warn('peer review blocked by calibration gate', { attemptId, userId: user.id });
      return res.status(403).json({
        error: 'Complete calibration first',
        details: { missing: ['Finish the peer calibration essays'] },
      });
    }
  }

  if (role === 'teacher' && !isCoach) {
    logger.warn('teacher review requires elevated role', { attemptId, userId: user.id, reviewerRole });
    return res.status(403).json({ error: 'Teacher role required' });
  }

  if (attemptRow.status !== 'scored' && role !== 'teacher') {
    logger.info('review blocked until scoring completes', { attemptId, status: attemptRow.status, userId: user.id });
    return res.status(409).json({ error: 'Attempt must be scored before reviews are added' });
  }

  const { error } = await supabase
    .from('writing_reviews')
    .insert({
      attempt_id: attemptId,
      reviewer_id: user.id,
      role,
      scores_json: scores ?? null,
      comments_json: comments ?? null,
      audio_url: audioUrl ?? null,
    });

  if (error) {
    logger.error('failed to save review', { error: error.message, attemptId, userId: user.id });
    return res.status(500).json({ error: error.message });
  }

  logger.info('review submitted', { attemptId, reviewerRole: role, userId: user.id });
  await trackor.log('writing_peer_review_submitted', {
    attempt_id: attemptId,
    reviewer_id: user.id,
    role,
    audio_attachment: audioUrl ? 1 : 0,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ ok: true });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
