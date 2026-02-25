// pages/api/premium/signout.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const isProd = process.env.NODE_ENV === 'production';

export default function handler(req: NextApiRequest, res: NextApiResponse<{ ok: true }>) {
  const cookie = [
    'pr_pin_ok=0',
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
    isProd ? 'Secure' : null,
  ]
    .filter(Boolean)
    .join('; ');

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
