import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  sessionId: z.string().uuid(),
});

type Flag = {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  details: Record<string, any>;
};
type FlagsResponse =
  | { ok: true; sessionId: string; flags: Flag[] }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<FlagsResponse>) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { sessionId } = parsed.data;

  // Verify proctor access (assumes proctors table)
  const { data: proctor } = await supabase
    .from('proctors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!proctor) return res.status(403).json({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });

  // Verify session exists
  const { data: session } = await supabase
    .from('proctoring_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return res.status(404).json({ ok: false, error: 'Session not found', code: 'NOT_FOUND' });

  // Fetch flags
  const { data, error } = await supabase
    .from('proctoring_flags')
    .select('id, session_id, type, created_at, details_json')
    .eq('session_id', sessionId);

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  const flags: Flag[] = (data ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    type: row.type,
    timestamp: row.created_at,
    details: row.details_json ?? {},
  }));

  return res.status(200).json({ ok: true, sessionId, flags });
}

export default withPlan('starter', handler);
