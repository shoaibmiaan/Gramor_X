import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';

const BodySchema = z.object({
  promptId: z.string().uuid(),
  bookmark: z.boolean().optional(),
});

type ResponseBody = { ok: true; bookmarked: boolean } | { error: string; details?: unknown };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = BodySchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body', details: parse.error.flatten() });
  }

  const { promptId, bookmark = true } = parse.data;
  const supabase = getServerClient(req, res);
  const { data: auth } = await supabase.auth.getUser();

  const user = auth?.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = {
    user_id: user.id,
    prompt_id: promptId,
    is_bookmarked: bookmark,
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('speaking_prompt_saves').upsert(payload, { onConflict: 'user_id,prompt_id' });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, bookmarked: bookmark });
}
