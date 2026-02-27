import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { generatePlanFromAI } from '@/lib/ai/studyPlanGenerator'; // core AI logic
import type { StudyPlan } from '@/types/study-plan';

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

  const parse = GenerateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { targetBand, examDate, baselineScores, learningStyle } = parse.data;

  try {
    // Call AI service to generate plan
    const plan: StudyPlan = await generatePlanFromAI({
      targetBand,
      examDate,
      baselineScores,
      learningStyle,
    });

    // Save plan to database
    const { error: insertError } = await supabase
      .from('user_study_plans')
      .insert({
        user_id: user.id,
        plan,
        generated_at: new Date().toISOString(),
        active: true,
      });

    if (insertError) {
      console.error('Error saving study plan:', insertError);
      return res.status(500).json({ error: 'Failed to save study plan' });
    }

    // Optionally deactivate any previous active plans
    await supabase
      .from('user_study_plans')
      .update({ active: false })
      .eq('user_id', user.id)
      .neq('id', insertError?.details); // Not straightforward; better to handle in transaction or separate update.

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Plan generation error:', error);
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
}