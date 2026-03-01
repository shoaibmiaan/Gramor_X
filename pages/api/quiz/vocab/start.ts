import type { NextApiRequest, NextApiResponse } from 'next';

import { enforceSameOrigin } from '@/lib/security/csrf';
import { getServerClient } from '@/lib/supabaseServer';
import { trackor } from '@/lib/analytics/trackor.server';
import { resolveUserRole } from '@/lib/serverRole';
import { touchRateLimit } from '@/lib/rate-limit';
import { startVocabQuizSession, type StartQuizPayload } from '@/lib/services/vocabQuizService';

type ErrorPayload = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartQuizPayload | ErrorPayload>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceSameOrigin(req, res)) return;

  const rate = touchRateLimit(`quiz:start:${req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown'}`, 20, 60_000);
  if (rate.limited) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const role = await resolveUserRole(user);
  if (role === 'admin' || role === 'teacher' || role === 'student' || role === null) {
    // accepted roles
  } else {
    return res.status(403).json({ error: 'Forbidden role' });
  }

  const payload = await startVocabQuizSession({ userId: user.id, supabase });

  await trackor.log('vocab_quiz_started', {
    user_id: user.id,
    quiz_session_id: payload.quizSessionId,
    total_questions: payload.questions.length,
  });

  return res.status(200).json(payload);
}
