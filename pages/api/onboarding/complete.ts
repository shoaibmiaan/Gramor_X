import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { generateStudyPlan } from '@/lib/ai/studyPlanGenerator';

const Body = z.object({
  step: z.number().int().optional(),
  channels: z.array(z.enum(['email', 'whatsapp', 'in-app'])).min(1).optional(),
});

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

  const parse = Body.safeParse(req.body);
  const step = parse.success ? parse.data.step ?? 5 : 5;
  const channels = parse.success ? parse.data.channels : undefined;

  const update: Record<string, unknown> = {
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
    .eq('id', user.id);

  if (updateError) {
    // eslint-disable-next-line no-console
    console.error('Error completing onboarding:', updateError);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  await supabase.auth.updateUser({ data: { onboarding_complete: true } });

  const { data: profile } = await supabase
    .from('profiles')
    .select('target_band, exam_date, baseline_scores, learning_style')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    generateStudyPlan(user.id, profile).catch((err) =>
      // eslint-disable-next-line no-console
      console.error('Study plan generation failed:', err),
    );
  }

  return res.status(200).json({ ok: true });
}
