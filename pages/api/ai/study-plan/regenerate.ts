import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';
import { generatePlanFromAI } from '@/lib/ai/studyPlanGenerator';

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

  const parse = RegenerateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  // Fetch current profile to get missing fields if not provided
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('target_band, exam_date, baseline_scores, learning_style')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const input = {
    targetBand: parse.data.targetBand ?? profile.target_band,
    examDate: parse.data.examDate ?? profile.exam_date,
    baselineScores: parse.data.baselineScores ?? profile.baseline_scores,
    learningStyle: parse.data.learningStyle ?? profile.learning_style,
  };

  // Validate required fields
  if (!input.targetBand || !input.baselineScores || !input.learningStyle) {
    return res.status(400).json({ error: 'Insufficient data to regenerate plan' });
  }

  try {
    const plan = await generatePlanFromAI(input);

    // Insert new plan as active
    const { error: insertError } = await supabase
      .from('user_study_plans')
      .insert({
        user_id: user.id,
        plan,
        generated_at: new Date().toISOString(),
        active: true,
      });

    if (insertError) {
      throw insertError;
    }

    // Deactivate previous plans
    await supabase
      .from('user_study_plans')
      .update({ active: false })
      .eq('user_id', user.id)
      .neq('active', true); // safer: update all where active = true except the new one (but we don't have ID yet). Alternative: update all and rely on the newest active.

    // Better: set all to false, then the new one is active
    await supabase
      .from('user_study_plans')
      .update({ active: false })
      .eq('user_id', user.id);

    // Now set the new one active
    await supabase
      .from('user_study_plans')
      .update({ active: true })
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1);

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Regeneration error:', error);
    return res.status(500).json({ error: 'Failed to regenerate study plan' });
  }
}