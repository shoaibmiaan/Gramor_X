import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const BaselineSchema = z.object({
  reading: z.number().min(0).max(9),
  writing: z.number().min(0).max(9),
  listening: z.number().min(0).max(9),
  speaking: z.number().min(0).max(9),
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

  const parse = BaselineSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { reading, writing, listening, speaking } = parse.data;
  const baselineScores = { reading, writing, listening, speaking };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ baseline_scores: baselineScores, onboarding_step: 3 })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error saving baseline scores:', updateError);
    return res.status(500).json({ error: 'Failed to save' });
  }

  return res.status(200).json({ success: true });
}