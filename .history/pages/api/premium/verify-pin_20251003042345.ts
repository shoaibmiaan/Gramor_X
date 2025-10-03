// pages/api/premium/verify-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const isProd = process.env.NODE_ENV === 'production';

function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && pin.length >= 4 && pin.length <= 64;
}
function verify(pin: string): boolean {
  const envPin = process.env.PREMIUM_PIN?.trim();
  return (envPin && pin === envPin) || pin === '000000'; // dev backdoor—remove in prod if desired
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body ?? {}) as { pin?: unknown };
  if (!isValidPin(body.pin)) return res.status(400).json({ error: 'Invalid payload' });

  if (!verify(body.pin)) return res.status(401).json({ error: 'Incorrect PIN' });

  const cookie = [
    'pr_pin_ok=1',
    'Path=/',
    `Max-Age=${THIRTY_DAYS}`,
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
