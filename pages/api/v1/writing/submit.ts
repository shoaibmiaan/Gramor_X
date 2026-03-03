import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { authenticateApiKey } from '@/lib/apiKeyAuth';
import { supabaseService } from '@/lib/supabaseServer';

const schema = z.object({ prompt_id: z.string().min(1), response_text: z.string().min(20) });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const auth = await authenticateApiKey(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error });

  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.flatten() });

  const db = supabaseService() as any;
  const { data, error } = await db.from('writing_responses').insert({
    user_id: auth.userId,
    prompt_id: parsed.data.prompt_id,
    response_text: parsed.data.response_text,
    status: 'submitted',
  }).select('id, created_at').maybeSingle();

  if (error) return res.status(500).json({ error: 'submit_failed' });
  return res.status(201).json({ submission: data });
}
