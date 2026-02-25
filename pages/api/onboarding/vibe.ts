import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const VibeSchema = z.object({
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

  const parse = VibeSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }

  const { learningStyle } = parse.data;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ learning_style: learningStyle, onboarding_step: 4 })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error saving learning style:', updateError);
    return res.status(500).json({ error: 'Failed to save' });
  }

  return res.status(200).json({ success: true });
}