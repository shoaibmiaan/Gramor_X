// pages/api/premium/verify-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const Body = z.object({ pin: z.string().min(4).max(64) });

/**
 * Accept either:
 * - env PREMIUM_PIN (simple dev flow), OR
 * - a hardcoded dev backdoor "000000" (optional: remove in prod)
 * If you already store hashed pins in DB, replace `isValidPin` with your check.
 */
function isValidPin(pin: string): boolean {
  const envPin = process.env.PREMIUM_PIN?.trim();
  return (envPin && pin === envPin) || pin === '000000';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parse = Body.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' });

  const { pin } = parse.data;
  if (!isValidPin(pin)) return res.status(401).json({ error: 'Incorrect PIN. Try again.' });

  // Cookie visible to middleware; HttpOnly so JS can’t read it; SameSite=Lax to survive normal nav.
  const thirtyDays = 60 * 60 * 24 * 30;
  const isProd = process.env.NODE_ENV === 'production';

  // On localhost (http) DO NOT set Secure, otherwise the cookie is dropped.
  const cookie = [
    'pr_pin_ok=1',
    'Path=/',
    `Max-Age=${thirtyDays}`,
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : null, // only add Secure in prod
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
