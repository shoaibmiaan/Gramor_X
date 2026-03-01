import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    ok: false,
    error: 'deprecated',
    message: 'Client-side session bridging is disabled. Use /auth/callback server exchange flow.',
  });
}
