import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BodySchema = z.object({
  paperId: z.string().min(1),
  attemptId: z.string().min(1),
  startedAt: z.number().optional(),
  updatedAt: z.number(),
  content: z.object({
    task1: z.string(),
    task2: z.string(),
    task1WordCount: z.number(),
    task2WordCount: z.number(),
  }),
});

type Resp =
  | { ok: true }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Resp>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthenticated' });
  }

  const { paperId, attemptId, startedAt, updatedAt, content } = parsed.data;

  try {
    const startedIso = new Date(startedAt ?? updatedAt).toISOString();
    const updatedIso = new Date(updatedAt).toISOString();

    const { error } = await supabaseAdmin
      .from('attempts_writing')
      .upsert(
        {
          id: attemptId,
          user_id: user.id,
          prompt_id: paperId,
          started_at: startedIso,
          submitted_at: null,
          content_text: JSON.stringify({
            version: 1,
            updatedAt: updatedIso,
            tasks: {
              task1: { text: content.task1, wordCount: content.task1WordCount },
              task2: { text: content.task2, wordCount: content.task2WordCount },
            },
          }),
        },
        { onConflict: 'id' },
      );

    if (error) {
      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('writing draft persistence failed', err);
    return res.status(200).json({ ok: false, error: err?.message ?? 'Persistence failed' });
  }
}
