// pages/api/auth/set-session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  let supabase;
  try {
    supabase = createPagesServerClient({ req, res });
  } catch (error) {
    console.error('Set-session API - Supabase client creation failed:', error);
    return res.status(503).json({ ok: false, error: 'service_unavailable' });
  }

  const { event, session } = req.body as { event: string; session: any };

  try {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      // writes sb-access-token / sb-refresh-token cookies
      await supabase.auth.setSession(session);
      return res.status(200).json({ ok: true });
    }
    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut();
      return res.status(200).json({ ok: true });
    }
    // No-op for other events
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Set-session API - Session operation failed:', e);
    return res.status(200).json({ ok: false });
  }
}