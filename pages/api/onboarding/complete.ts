// pages/api/onboarding/complete.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import onboardingHandler from './index';
import {
  NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER,
  TOTAL_ONBOARDING_STEPS,
} from '@/lib/onboarding/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const channels =
    Array.isArray(req.body?.channels) && req.body.channels.length > 0
      ? req.body.channels
      : [NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER[0]];

  req.body = {
    step: TOTAL_ONBOARDING_STEPS,
    data: {
      channels,
      preferredTime: req.body?.preferredTime ?? null,
      phone: req.body?.phone ?? null,
      whatsappOptIn: req.body?.whatsappOptIn,
    },
  };

  return onboardingHandler(req, res);
}
