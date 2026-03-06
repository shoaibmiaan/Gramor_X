// pages/api/auth/set-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const supabase = getServerClient(req, res);
  const { event, session } = req.body ?? {};

  if (!event || typeof event !== 'string') {
    return res.status(400).json({ ok: false, error: 'missing_event' });
  }

  try {
    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut();
      return res.status(200).json({ ok: true });
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (!session?.access_token) {
        return res.status(200).json({ ok: false, error: 'missing_tokens' });
      }
      // This sets the correct cookies automatically
      await supabase.auth.setSession(session);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Set-session API error:', e);
    return res.status(200).json({ ok: false });
  }
}