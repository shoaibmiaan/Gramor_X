// pages/api/lifecycle/trigger.ts
import type { NextApiHandler } from 'next';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { enqueueLifecycleEvent } from '@/lib/lifecycle/events';

const BodySchema = z.object({
  event: z.enum(['first_mock_done', 'band_up', 'streak_broken']),
  context: z.record(z.any()).optional(),
  dedupeKey: z.string().min(1).max(120).optional(),
});

type SuccessResponse = {
  ok: true;
  id: number;
  channels: string[];
  locale: string;
};

type SkipResponse = {
  ok: false;
  reason: 'no_channels' | 'duplicate';
  id?: number;
  channels?: string[];
};

type ErrorResponse = { ok: false; error: string };

const handler: NextApiHandler<SuccessResponse | SkipResponse | ErrorResponse> = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const parse = BodySchema.safeParse(req.body ?? {});
  if (!parse.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const result = await enqueueLifecycleEvent({
      userId: user.id,
      event: parse.data.event,
      context: parse.data.context,
      dedupeKey: parse.data.dedupeKey ?? null,
    });

    if (!result.ok) {
      return res.status(200).json(result);
    }

    return res.status(200).json({
      ok: true,
      id: result.id,
      channels: result.channels,
      locale: result.locale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ ok: false, error: message });
  }
};

export default handler;
