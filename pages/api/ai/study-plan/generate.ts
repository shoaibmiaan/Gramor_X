import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { generatePlanFromAI } from '@/lib/ai/studyPlanGenerator';
import type { StudyPlan } from '@/types/study-plan';
import { createAiRecommendation } from '@/lib/repositories/aiRepository';
import { env } from '@/lib/env';

const GenerateSchema = z.object({
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

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const parse = GenerateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { targetBand, examDate, baselineScores, learningStyle } = parse.data;

  try {
    const plan: StudyPlan = await generatePlanFromAI({
      targetBand,
      examDate,
      baselineScores,
      learningStyle,
    });

    await supabase.from('user_study_plans').update({ active: false }).eq('user_id', user.id).eq('active', true);

    const { error: insertError } = await supabase.from('user_study_plans').insert({
      user_id: user.id,
      plan,
      generated_at: new Date().toISOString(),
      active: true,
    });

    if (insertError) {
      console.error('Error saving study plan:', insertError);
      return res.status(500).json({ error: 'Failed to save study plan' });
    }

    const recommendationContent = {
      summary: `Follow your new ${plan.totalWeeks ?? 8}-week IELTS plan with daily practice blocks.`,
      planHighlights: {
        targetBand,
        learningStyle,
      },
      sequence: ['reading', 'writing', 'listening', 'speaking'],
    };

    await createAiRecommendation(supabase as any, {
      userId: user.id,
      type: 'study_plan',
      priority: 5,
      content: recommendationContent,
      modelVersion: env.OPENAI_MODEL ?? 'fallback-model',
      expiresAt: plusDaysIso(30),
    });

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Plan generation error:', error);
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
}
