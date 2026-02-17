// pages/api/onboarding/complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';

const Body = z.object({
  step: z
    .union([
      z.number().int(),
      z.string().transform((v) => {
        const n = Number.parseInt(v, 10);
        return Number.isNaN(n) ? 5 : n;
      }),
    ])
    .optional(),
  channels: z
    .array(z.enum(['email', 'whatsapp', 'in-app']))
    .min(1)
    .optional(),
});

function normalizeBody(req: NextApiRequest): unknown {
  const raw = req.body;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (raw instanceof Buffer) {
    try {
      return JSON.parse(raw.toString('utf8'));
    } catch {
      return {};
    }
  }

  if (raw == null) return {};
  return raw;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = normalizeBody(req);
  const parse = Body.safeParse(body);

  let step = 5;
  let channels: ('email' | 'whatsapp' | 'in-app')[] | undefined;

  if (parse.success) {
    step = parse.data.step ?? 5;
    channels = parse.data.channels;
  } else {
    console.warn(
      'onboarding/complete: body validation failed',
      parse.error.flatten()
    );
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('onboarding/complete auth error:', authError);
  }

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const patch: Record<string, any> = {
    onboarding_step: step,
    onboarding_complete: true,
    draft: false,
  };

  if (channels && channels.length > 0) {
    patch.notification_channels = channels;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('onboarding/complete update error:', updateError);
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  return res.status(200).json({ ok: true });
}
