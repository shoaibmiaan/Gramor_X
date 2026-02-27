import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  kind: z.enum(['tip', 'micro']),
  refId: z.string().min(1),
  draft: z.string().optional(), // optional text the user wrote (for future analytics)
});

type Ok = { ok: true; id: string; createdAt: string };
type Err = { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const { kind, refId, draft } = parse.data;

  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // build a tiny meta payload (safe to expand later)
  const meta = {
    draft_len: typeof draft === 'string' ? Math.min(draft.length, 10000) : 0,
  };

  const { data, error } = await supabase
    .from('writing_activity_log')
    .insert({
      user_id: user.id,
      kind,
      ref_id: refId,
      meta,
    })
    .select('id, created_at')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Insert failed', details: { code: error.code, message: error.message } });
  }

  return res.status(200).json({ ok: true, id: data!.id as string, createdAt: data!.created_at as string });
}
