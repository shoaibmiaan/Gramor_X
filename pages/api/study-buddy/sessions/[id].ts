// pages/api/study-buddy/sessions/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Params = z.object({
  id: z.string().uuid(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Parse and validate route param
  const parse = Params.safeParse({ id: req.query.id });
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid id', details: parse.error.flatten() });
  }
  const sessionId = parse.data.id;

  // Server-side Supabase client (per-request)
  const supabase = getServerClient(req, res);

  // Enforce auth
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return res.status(500).json({ error: 'Auth error', details: userErr.message });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Fetch session
  const { data: session, error: fetchErr } = await supabase
    .from('study_buddy_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchErr) return res.status(404).json({ error: 'Session not found' });

  // Re-check ownership (don’t trust client IDs)
  if (session.user_id !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return res.status(200).json({ ok: true, session });
}
