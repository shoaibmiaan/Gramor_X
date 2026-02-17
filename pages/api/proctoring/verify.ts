import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  sessionId: z.string().uuid(),
  verificationType: z.enum(['face', 'id_card', 'environment']),
  data: z.record(z.string(), z.any()), // e.g., { imageUrl, confidence }
});

type VerifyResponse =
  | { ok: true; sessionId: string; status: 'verified' | 'failed' }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<VerifyResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { sessionId, verificationType, data } = parsed.data;

  // Verify proctor access
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

  // TODO: integrate with verification service to process data
  const status = 'verified'; // or 'failed' based on actual verification

  // Log verification attempt
  const { error } = await supabase
    .from('proctoring_verifications')
    .insert({
      session_id: sessionId,
      type: verificationType,
      data_json: data,
      status,
    });

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  return res.status(200).json({ ok: true, sessionId, status });
}

export default withPlan('starter', handler);
