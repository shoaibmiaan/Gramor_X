import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { generatePlanFromAI } from '@/lib/ai/studyPlanGenerator';
import { upsertOnboardingSession, upsertUserPreferences } from '@/lib/repositories/profileRepository';
import { createAiDiagnostic, createAiRecommendation } from '@/lib/repositories/aiRepository';
import { env } from '@/lib/env';
import { createDomainLogger } from '@/lib/obs/domainLogger';

const RegenerateSchema = z.object({
  targetBand: z.number().min(4).max(9).optional(),
  examDate: z.string().nullable().optional(),
  baselineScores: z
    .object({
      reading: z.number().min(0).max(9),
      writing: z.number().min(0).max(9),
      listening: z.number().min(0).max(9),
      speaking: z.number().min(0).max(9),
    })
    .optional(),
  learningStyle: z.enum(['video', 'tips', 'practice', 'flashcards']).optional(),
});

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log = createDomainLogger('/api/ai/study-plan/regenerate');
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parse = RegenerateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const [prefsRes, onboardingRes] = await Promise.all([
    supabase
      .from('user_preferences')
      .select('goal_band, exam_date, learning_style')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('onboarding_sessions')
      .select('payload')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ payload: { baseline_scores?: Record<string, number> } | null }>(),
  ]);

  const input = {
    targetBand: parse.data.targetBand ?? prefsRes.data?.goal_band ?? null,
    examDate: parse.data.examDate ?? prefsRes.data?.exam_date ?? null,
    baselineScores: parse.data.baselineScores ?? onboardingRes.data?.payload?.baseline_scores ?? null,
    learningStyle: parse.data.learningStyle ?? prefsRes.data?.learning_style ?? null,
  };

  if (!input.targetBand || !input.baselineScores || !input.learningStyle) {
    return res.status(400).json({ error: 'Insufficient data to regenerate plan' });
  }

  try {
    const plan = await generatePlanFromAI(input);

    await supabase.from('user_study_plans').update({ active: false }).eq('user_id', user.id).eq('active', true);

    const { error: insertError } = await supabase.from('user_study_plans').insert({
      user_id: user.id,
      plan,
      generated_at: new Date().toISOString(),
      active: true,
    });

    if (insertError) throw insertError;

    await Promise.all([
      upsertUserPreferences(supabase as any, user.id, {
        goal_band: input.targetBand,
        exam_date: input.examDate,
        learning_style: input.learningStyle,
      }),
      upsertOnboardingSession(supabase as any, user.id, {
        payload: {
          baseline_scores: input.baselineScores,
          regenerated_at: new Date().toISOString(),
        },
      }),
      createAiRecommendation(supabase as any, {
        userId: user.id,
        type: 'study_plan_regeneration',
        priority: 5,
        content: {
          summary: 'Your study plan was regenerated using your latest profile and onboarding signals.',
          sequence: ['reading', 'writing', 'listening', 'speaking'],
          targetBand: input.targetBand,
        },
        modelVersion: env.OPENAI_MODEL ?? 'fallback-model',
        expiresAt: plusDaysIso(30),
      }),
      createAiDiagnostic(
        supabase as any,
        user.id,
        'study_plan_regeneration',
        { targetBand: input.targetBand, learningStyle: input.learningStyle },
        env.OPENAI_MODEL ?? 'fallback-model',
      ),
    ]);

    log.info('ai.recommendation.regenerated', { userId: user.id, type: 'study_plan_regeneration', targetBand: input.targetBand });
    return res.status(200).json({ plan });
  } catch (error) {
    log.error('ai.recommendation.regenerated', { userId: user.id, error: error instanceof Error ? error.message : 'unknown' });
    console.error('Regeneration error:', error);
    return res.status(500).json({ error: 'Failed to regenerate study plan' });
  }
}
