import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import { trackor } from '@/lib/analytics/trackor.server';
import { calculateDurationSeconds, getExamAttemptStart } from '@/lib/exam/telemetry';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const attemptId = String(req.query.attemptId || '');
  if (!attemptId) return res.status(400).json({ error: 'Missing attemptId' });

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { text } = (req.body ?? {}) as { text?: string };
  const submittedAt = new Date();

  // Upsert attempt row and mark as submitted
  const { error } = await supabaseAdmin
    .from('exam_attempts')
    .upsert(
      {
        id: attemptId,
        user_id: user.id,
        submitted_at: submittedAt.toISOString(),
        text: text ?? null,
      },
      { onConflict: 'id' }
    );

  if (error) return res.status(500).json({ error: error.message });

  const startAt = await getExamAttemptStart(attemptId);
  const duration = calculateDurationSeconds(startAt, submittedAt);

  await trackor.log('core_exam_submit', {
    attemptId,
    duration,
    score: null,
  });

  return res.status(200).json({ attemptId });
}
