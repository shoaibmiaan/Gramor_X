import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const BodySchema = z.object({
  examId: z.string().uuid(),
  device: z.object({
    ua: z.string().max(512),
    platform: z.string().max(64).optional(),
  }).optional(),
});

type StartResponse =
  | { ok: true; sessionId: string }
  | { ok: false; error: string; code?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'DB_ERROR' | 'BAD_REQUEST' };

async function handler(req: NextApiRequest, res: NextApiResponse<StartResponse>) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.message, code: 'BAD_REQUEST' });
  const { examId, device } = parsed.data;

  // Verify exam exists
  const { data: exam } = await supabase.from('exams').select('id').eq('id', examId).maybeSingle();
  if (!exam) return res.status(404).json({ ok: false, error: 'Exam not found', code: 'NOT_FOUND' });

  // Create proctoring session
  const { data: session, error } = await supabase
    .from('proctoring_sessions')
    .insert({
      exam_id: examId,
      user_id: user.id,
      status: 'active',
      device_json: device ?? null,
    })
    .select('id')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message, code: 'DB_ERROR' });

  return res.status(200).json({ ok: true, sessionId: session!.id as string });
}

export default withPlan('starter', handler);
