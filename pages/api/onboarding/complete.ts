// pages/api/onboarding/complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabaseServer';
import { upsertNotificationSettings, upsertOnboardingSession } from '@/lib/repositories/profileRepository';
import { createDomainLogger } from '@/lib/obs/domainLogger';

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

  const log = createDomainLogger('/api/onboarding/complete');
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

  const completedAt = new Date().toISOString();

  const { error: sessionError } = await upsertOnboardingSession(supabase as any, user.id, {
    current_step: step,
    status: 'completed',
    completed_at: completedAt,
    payload: { completed_via: 'api/onboarding/complete' },
  });

  if (sessionError) {
    console.error('onboarding/complete onboarding session error:', sessionError);
    return res.status(500).json({ error: 'Failed to update onboarding session' });
  }


  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      onboarding_completed_at: completedAt,
      onboarding_complete: true,
      onboarding_step: Math.max(step, 5),
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('onboarding/complete profile update error:', profileError);
    return res.status(500).json({ error: 'Failed to finalize onboarding profile' });
  }

  if (channels && channels.length > 0) {
    const { error: notificationError } = await upsertNotificationSettings(supabase as any, user.id, channels);
    if (notificationError) {
      console.error('onboarding/complete notification settings error:', notificationError);
      return res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }

  // 🔁 Sync the onboarding_complete flag to the user's metadata
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { onboarding_complete: true, onboarding_required: false }
  });

  if (metadataError) {
    console.error('onboarding/complete metadata update error:', metadataError);
    // Non‑fatal – we still return 200 because the profile is updated.
    // The client can refresh the session manually.
  }

  log.info('onboarding.completed', { userId: user.id, step, channels: channels ?? [] });
  return res.status(200).json({ ok: true });
}
