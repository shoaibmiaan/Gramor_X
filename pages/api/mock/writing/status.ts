import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

interface StatusResponse {
  ok: true;
  attemptId: string;
  status: string;
  submittedAt: string | null;
  aiReady: boolean;
  responses: number;
}

interface ErrorResponse {
  ok: false;
  error: string;
}

type ResponseData = StatusResponse | ErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const attemptId = typeof req.query.attemptId === 'string' ? req.query.attemptId : null;
  if (!attemptId) {
    return res.status(400).json({ ok: false, error: 'attemptId is required' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('id, user_id, status, submitted_at, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.user_id !== user.id) {
    return res.status(404).json({ ok: false, error: 'Attempt not found' });
  }

  const { data: responses } = await supabase
    .from('writing_responses')
    .select('overall_band')
    .eq('exam_attempt_id', attemptId);

  const aiReady = (responses ?? []).some((row) => typeof row.overall_band === 'number');

  return res.status(200).json({
    ok: true,
    attemptId,
    status: attempt.status ?? 'unknown',
    submittedAt: attempt.submitted_at ?? attempt.updated_at ?? null,
    aiReady,
    responses: responses?.length ?? 0,
  });
}
