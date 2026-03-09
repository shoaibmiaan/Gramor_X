import type { NextApiRequest, NextApiResponse } from 'next';

import { completeOnboarding, type UserOnboarding } from '@/lib/onboarding';
import { getServerClient } from '@/lib/supabaseServer';

type ErrorResponse = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserOnboarding | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  const data = await completeOnboarding(supabase, user.id);
  return res.status(200).json(data);
}
