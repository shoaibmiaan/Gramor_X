import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { generateStudyPlan } from '@/lib/ai/studyPlanGenerator';

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

  try {
    // Get complete profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if study plan already exists
    const { data: existingPlan } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingPlan) {
      // Plan already exists, just update step
      await supabase
        .from('profiles')
        .update({ onboarding_step: 6 })
        .eq('user_id', user.id);

      return res.status(200).json({
        success: true,
        message: 'Study plan already exists',
        nextStep: '/dashboard'
      });
    }

    // Log generation start
    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        type: 'study_plan',
        status: 'started',
        created_at: new Date().toISOString()
      });

    // Generate study plan (non-blocking - fire and forget)
    generateStudyPlan(user.id, profile).catch(async (error) => {
      console.error('Background generation failed:', error);

      // Log failure
      await supabase
        .from('generation_logs')
        .insert({
          user_id: user.id,
          type: 'study_plan',
          status: 'failed',
          error: error.message,
          created_at: new Date().toISOString()
        });
    });

    // Update step to 5 (thinking/generating)
    await supabase
      .from('profiles')
      .update({ onboarding_step: 5 })
      .eq('user_id', user.id);

    return res.status(200).json({
      success: true,
      nextStep: '/onboarding/thinking',
      message: 'Study plan generation started'
    });

  } catch (error) {
    console.error('Error in complete handler:', error);

    // Log failure
    await supabase
      .from('generation_logs')
      .insert({
        user_id: user.id,
        type: 'study_plan',
        status: 'failed',
        error: error.message,
        created_at: new Date().toISOString()
      });

    return res.status(500).json({ error: 'Failed to start study plan generation' });
  }
}