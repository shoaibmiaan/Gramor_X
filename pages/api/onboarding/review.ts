import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const ReviewSchema = z.object({
  confirmed: z.boolean(),
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

  const parse = ReviewSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { confirmed } = parse.data;

  if (!confirmed) {
    return res.status(400).json({ error: 'Must confirm to proceed' });
  }

  // Get user's complete profile data for review
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching profile:', profileError);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }

  // Update onboarding step to 5 (review completed, ready for thinking/generation)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ onboarding_step: 5 })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating step:', updateError);
    return res.status(500).json({ error: 'Failed to update' });
  }

  // Return profile data for review display
  return res.status(200).json({
    success: true,
    nextStep: '/onboarding/thinking',
    profile: {
      target_band: profile.target_band,
      exam_date: profile.exam_date,
      baseline_scores: profile.baseline_scores,
      learning_style: profile.learning_style,
      weekly_availability: profile.weekly_availability
    }
  });
}