import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireRole } from '@/lib/requireRole';

interface FeedbackPayload {
  attemptId?: string;
  feedback?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let userId: string;
  try {
    const { user } = await requireRole(req, ['teacher', 'admin']);
    userId = user.id;
  } catch {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const { attemptId, feedback } = req.body as FeedbackPayload;
  if (!attemptId || typeof attemptId !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing attemptId' });
  }

  const normalized = typeof feedback === 'string' ? feedback.trim() : '';

  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from('speaking_attempts')
    .select('id')
    .eq('id', attemptId)
    .single();

  if (attemptError || !attempt) {
    return res.status(404).json({ ok: false, error: 'Attempt not found' });
  }

  const savedAt = normalized ? new Date().toISOString() : null;

  const updatePayload = {
    teacher_feedback: normalized || null,
    teacher_feedback_by: normalized ? userId : null,
    teacher_feedback_at: savedAt,
  };

  const { error: updateError } = await supabaseAdmin
    .from('speaking_attempts')
    .update(updatePayload)
    .eq('id', attemptId);

  if (updateError) {
    return res.status(500).json({ ok: false, error: updateError.message || 'Failed to save feedback' });
  }

  let authorName: string | null = null;
  if (updatePayload.teacher_feedback_by) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    authorName = (profile?.full_name as string | null | undefined) ?? null;
  }

  return res.status(200).json({
    ok: true,
    feedback: updatePayload.teacher_feedback,
    savedAt: updatePayload.teacher_feedback_at,
    authorId: updatePayload.teacher_feedback_by,
    authorName,
  });
}
