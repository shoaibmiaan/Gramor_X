import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

type AuthState =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      userId: string;
      role: string | null;
      onboardingComplete: boolean;
    };

type ErrorResponse = { error: string };

type Response = AuthState | ErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Response>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'private, no-store');

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return res.status(500).json({ error: userError.message });
  }

  if (!user) {
    return res.status(200).json({ authenticated: false });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role,onboarding_complete')
    .or(`user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  const role =
    (profile as { role?: string | null } | null)?.role ??
    (user.app_metadata?.role as string | undefined) ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((user.user_metadata as any)?.role as string | undefined) ??
    null;

  const onboardingComplete =
    profile?.onboarding_complete === true ||
    (user.user_metadata as Record<string, unknown> | undefined)?.onboarding_complete === true;

  return res.status(200).json({
    authenticated: true,
    userId: user.id,
    role,
    onboardingComplete,
  });
}
