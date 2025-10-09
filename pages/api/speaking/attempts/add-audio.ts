import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const RequestSchema = z.object({
  attemptId: z.string().uuid(),
  part: z.enum(['p1', 'p2', 'p3', 'chat']),
  path: z.string().min(1),
  durationSec: z.number().min(0).max(60 * 60).optional(),
});

type SuccessResponse = {
  ok: true;
  audioUrls: Record<string, string[]>;
};

type ErrorResponse = { ok: false; error: string };

function mergePathMap(
  current: Record<string, unknown> | null | undefined,
  part: string,
  path: string,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  if (current && typeof current === 'object') {
    for (const [key, value] of Object.entries(current)) {
      if (Array.isArray(value)) {
        result[key] = value.filter((item): item is string => typeof item === 'string');
      } else if (typeof value === 'string') {
        result[key] = [value];
      }
    }
  }

  const next = result[part] ? [...result[part]] : [];
  if (!next.includes(path)) next.push(path);
  result[part] = next;
  return result;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const parsed = RequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request' });
  }

  const { attemptId, part, path } = parsed.data;

  const supabase = createSupabaseServerClient({ req });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const { data: attempt, error } = await supabaseAdmin
    .from('speaking_attempts')
    .select('id,user_id,status,audio_urls')
    .eq('id', attemptId)
    .single();

  if (error || !attempt) {
    return res.status(404).json({ ok: false, error: 'Attempt not found' });
  }

  if (attempt.user_id !== user.id) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  const audioUrls = mergePathMap(attempt.audio_urls as Record<string, unknown> | null, part, path);
  const nextStatus = attempt.status === 'completed' ? attempt.status : 'recorded';

  const { error: updateErr } = await supabaseAdmin
    .from('speaking_attempts')
    .update({ audio_urls: audioUrls, status: nextStatus })
    .eq('id', attemptId);

  if (updateErr) {
    return res.status(400).json({ ok: false, error: updateErr.message });
  }

  return res.status(200).json({ ok: true, audioUrls });
}
