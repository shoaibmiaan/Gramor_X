import type { NextApiRequest, NextApiResponse } from 'next';

import { loadCoachSession } from '@/lib/writing/coach';
import { flags } from '@/lib/flags';
import { getServerClient } from '@/lib/supabaseServer';

export type CoachSessionResponse =
  | { ok: true; session: Awaited<ReturnType<typeof loadCoachSession>> }
  | { ok: false; error: string; code: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CoachSessionResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ ok: false, error: 'Method not allowed', code: 'method_not_allowed' });
    return;
  }

  if (!flags.enabled('coach')) {
    res.status(404).json({ ok: false, error: 'Coach feature disabled', code: 'coach_disabled' });
    return;
  }

  const attemptId = typeof req.query.attemptId === 'string' ? req.query.attemptId : null;
  if (!attemptId) {
    res.status(400).json({ ok: false, error: 'Missing attemptId', code: 'bad_request' });
    return;
  }

  const supabase = getServerClient(req, res);
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    res.status(401).json({ ok: false, error: 'Authentication required', code: 'auth_required' });
    return;
  }

  const snapshot = await loadCoachSession(supabase, session.user.id, attemptId);
  if (!snapshot) {
    res.status(404).json({ ok: false, error: 'Attempt not found', code: 'not_found' });
    return;
  }

  res.status(200).json({ ok: true, session: snapshot });
}

