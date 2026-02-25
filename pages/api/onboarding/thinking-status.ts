import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

  // Check if study plan exists
  const { data: studyPlan, error: planError } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (planError) {
    console.error('Error checking study plan:', planError);
    return res.status(500).json({ error: 'Failed to check status' });
  }

  // Get current step
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_step')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    return res.status(500).json({ error: 'Failed to get status' });
  }

  // Determine generation status
  let status = 'generating';
  let progress = 30;

  if (studyPlan) {
    status = 'completed';
    progress = 100;
  } else if (profile.onboarding_step > 5) {
    status = 'completed';
    progress = 100;
  } else if (profile.onboarding_step === 5) {
    // Check if generation was attempted but failed
    const { data: errorLog } = await supabase
      .from('generation_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'study_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (errorLog && errorLog.status === 'failed') {
      status = 'failed';
      progress = 0;
    } else {
      status = 'generating';
      progress = 60;
    }
  }

  return res.status(200).json({
    status, // 'generating', 'completed', 'failed'
    progress,
    message: getStatusMessage(status, progress),
    nextStep: status === 'completed' ? '/dashboard' : null
  });
}

function getStatusMessage(status: string, progress: number): string {
  if (status === 'completed') {
    return 'Study plan ready! Redirecting to dashboard...';
  }
  if (status === 'failed') {
    return 'Generation failed. Please try again.';
  }
  if (progress < 50) {
    return 'Analyzing your profile...';
  }
  if (progress < 80) {
    return 'Creating personalized study plan...';
  }
  return 'Finalizing your plan...';
}