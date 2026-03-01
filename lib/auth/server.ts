import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { clearAuthCookies, setAuthCookies } from '@/lib/auth/cookies';

export function createServerSupabaseClient(req: NextApiRequest, res: NextApiResponse) {
  return getServerClient(req, res);
}

export async function exchangeAndSetSession(req: NextApiRequest, res: NextApiResponse, code: string) {
  const supabase = createServerSupabaseClient(req, res);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session?.access_token || !data.session.refresh_token) {
    return { ok: false as const, error: error?.message || 'exchange_failed' };
  }

  setAuthCookies(res, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
    expiresIn: data.session.expires_in,
  });

  return { ok: true as const, session: data.session };
}

export function clearSession(res: NextApiResponse) {
  clearAuthCookies(res);
}
