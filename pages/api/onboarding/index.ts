import type { NextApiRequest, NextApiResponse } from 'next';

import {
  getOnboarding,
  onboardingStepPayloadSchema,
  updateOnboarding,
  type UserOnboarding,
} from '@/lib/onboarding';
import { getServerClient } from '@/lib/supabaseServer';

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserOnboarding | ErrorResponse>,
) {
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const data = await getOnboarding(supabase, user.id);
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const parsed = onboardingStepPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(', ') });
    }

    const data = await updateOnboarding(supabase, user.id, parsed.data);
    return res.status(200).json(data);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
