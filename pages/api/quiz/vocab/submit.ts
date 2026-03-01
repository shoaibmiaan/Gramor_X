import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { enforceSameOrigin } from '@/lib/security/csrf';
import { getServerClient } from '@/lib/supabaseServer';
import { touchRateLimit } from '@/lib/rate-limit';
import { trackor } from '@/lib/analytics/trackor.server';
import {
  computeQuizScore,
  markQuizSessionUsed,
  persistPerWordPerformance,
  resolveQuizSession,
  type QuizSubmission,
} from '@/lib/services/vocabQuizService';
import { evaluateQuizWithAI } from '@/lib/ai/quizScoring';

const SubmissionSchema = z.object({
  quizSessionId: z.string().uuid(),
  elapsedMs: z.number().int().min(0).max(120_000),
  answers: z.array(z.object({
    questionId: z.string().min(1),
    selectedIndex: z.number().int().min(0).max(3),
    responseTimeMs: z.number().int().min(0).max(60_000),
  })).max(30),
});

type SubmitResponse = {
  score: { correct: number; total: number; accuracy: number; weightedAccuracy: number };
  estimatedBandImpact: { before: number; after: number; delta: number };
  strengths: string[];
  weaknesses: string[];
  recommendedNextWords: string[];
  suggestedDifficulty: 'easy' | 'medium' | 'hard';
};

type ErrorPayload = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitResponse | ErrorPayload>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!enforceSameOrigin(req, res)) return;

  const parsed = SubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const submission = parsed.data as QuizSubmission;
  const rate = touchRateLimit(`quiz:submit:${submission.quizSessionId}`, 3, 120_000);
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

  const resolved = resolveQuizSession(user.id, submission.quizSessionId);
  if ('error' in resolved) {
    return res.status(409).json({ error: resolved.error });
  }

  const { session } = resolved;
  const score = computeQuizScore(session.questions, submission.answers);
  const aiResult = evaluateQuizWithAI({
    score,
    questions: session.questions,
    answers: submission.answers,
  });

  await persistPerWordPerformance({
    supabase,
    userId: user.id,
    quizSessionId: submission.quizSessionId,
    questions: session.questions,
    answers: submission.answers,
  });

  await supabase.from('quiz_events').insert({
    user_id: user.id,
    quiz_session_id: submission.quizSessionId,
    event_type: 'submitted',
    payload: {
      elapsedMs: submission.elapsedMs,
      accuracy: score.accuracy,
      weightedAccuracy: score.weightedAccuracy,
      suggestedDifficulty: aiResult.suggestedDifficulty,
    },
  });

  markQuizSessionUsed(submission.quizSessionId);

  await trackor.log('vocab_quiz_submitted', {
    user_id: user.id,
    quiz_session_id: submission.quizSessionId,
    score_accuracy: score.accuracy,
    weighted_accuracy: score.weightedAccuracy,
  });

  return res.status(200).json({
    score: {
      correct: score.correct,
      total: score.total,
      accuracy: score.accuracy,
      weightedAccuracy: score.weightedAccuracy,
    },
    estimatedBandImpact: aiResult.estimatedBandImpact,
    strengths: aiResult.strengths,
    weaknesses: aiResult.weaknesses,
    recommendedNextWords: aiResult.recommendedNextWords,
    suggestedDifficulty: aiResult.suggestedDifficulty,
  });
}
