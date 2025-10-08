// pages/api/notifications/nudge.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CreateNudgeSchema } from '@/lib/schemas/notifications';

// Mock — in prod, wire to Twilio/Email
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ ok: boolean; error?: string }>,
) {
  if (req.method !== 'POST') return res.status(405).end();

  const bodyResult = CreateNudgeSchema.safeParse(req.body);

  if (!bodyResult.success) {
    return res.status(400).json({ ok: false, error: 'Missing fields' });
  }

  const { to, message } = bodyResult.data;

  try {
    // TODO: send via Twilio/SMTP
    console.log('Sending nudge →', { to, message });
    res.status(200).json({ ok: true });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ ok: false, error: messageText });
  }
}
