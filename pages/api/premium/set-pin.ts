// pages/api/premium/set-pin.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const THIRTY_DAYS = 60 * 60 * 24 * 30;
const isProd = process.env.NODE_ENV === 'production';

/** Test helper: directly set pr_pin_ok cookie. Disable in prod if undesired. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
