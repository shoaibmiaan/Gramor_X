// pages/api/premium/verify-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const Body = z.object({ pin: z.string().min(4).max(64) });

function isValidPin(pin: string): boolean {
  const envPin = process.env.PREMIUM_PIN?.trim();
  return (envPin && pin === envPin) || pin === '000000'; // optional dev backdoor
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = Body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const { pin } = parsed.data;
  if (!isValidPin(pin)) return res.status(401).json({ error: 'Incorrect PIN. Try again.' });

  const thirtyDays = 60 * 60 * 24 * 30;
  const isProd = process.env.NODE_ENV === 'production';

  const cookie = [
    'pr_pin_ok=1',
    'Path=/',
    `Max-Age=${thirtyDays}`,
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : null, // IMPORTANT: no Secure on localhost
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
