import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const GoalSchema = z.object({
  targetBand: z.number().min(4).max(9),
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

  const parse = GoalSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { targetBand } = parse.data;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ target_band: targetBand, onboarding_step: 1 })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error saving target band:', updateError);
    return res.status(500).json({ error: 'Failed to save' });
  }

  return res.status(200).json({ success: true });
}