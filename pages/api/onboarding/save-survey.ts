import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { upsertOnboardingSession, upsertUserPreferences } from '@/lib/repositories/profileRepository';

const SurveySchema = z.object({
  targetBand: z.number().min(4).max(9),
  examDate: z.string().nullable(),
  baselineScores: z.object({
    reading: z.number().min(0).max(9),
    writing: z.number().min(0).max(9),
    listening: z.number().min(0).max(9),
    speaking: z.number().min(0).max(9),
  }),
  learningStyle: z.enum(['video', 'tips', 'practice', 'flashcards']),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parse = SurveySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { targetBand, examDate, baselineScores, learningStyle } = parse.data;

  const { error: preferenceError } = await upsertUserPreferences(supabase as any, user.id, {
    goal_band: targetBand,
    exam_date: examDate,
    learning_style: learningStyle,
  });

  if (preferenceError) {
    console.error('Error saving survey preferences:', preferenceError);
    return res.status(500).json({ error: 'Failed to save survey preferences' });
  }

  const { error: onboardingError } = await upsertOnboardingSession(supabase as any, user.id, {
    current_step: 4,
    payload: {
      baseline_scores: baselineScores,
      learning_style: learningStyle,
      target_band: targetBand,
      exam_date: examDate,
    },
  });

  if (onboardingError) {
    console.error('Error saving onboarding session:', onboardingError);
    return res.status(500).json({ error: 'Failed to save survey data' });
  }

  return res.status(200).json({ success: true });
}