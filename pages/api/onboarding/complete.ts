import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { generateStudyPlan } from '@/lib/ai/studyPlanGenerator'; // we'll create this

const Body = z.object({
  step: z.number().int().optional(),
  channels: z.array(z.enum(['email', 'whatsapp', 'in-app'])).min(1).optional(),
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

  const parse = Body.safeParse(req.body);
  const step = parse.success ? parse.data.step ?? 5 : 5;
  const channels = parse.success ? parse.data.channels : undefined;

  const update: Record<string, any> = {
    onboarding_step: step,
    onboarding_complete: true,
    draft: false,
  };

  if (channels) {
    update.notification_channels = channels;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(update)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error completing onboarding:', updateError);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  // Trigger AI study plan generation asynchronously
  // We need to fetch the full survey data first
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_band, exam_date, baseline_scores, learning_style')
    .eq('user_id', user.id)
    .single();

  if (profile) {
    // Fire and forget
    generateStudyPlan(user.id, profile).catch((err) =>
      console.error('Study plan generation failed:', err)
    );
  }

  return res.status(200).json({ ok: true });
}