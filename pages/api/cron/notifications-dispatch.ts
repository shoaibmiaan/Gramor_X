import type { NextApiRequest, NextApiResponse } from 'next';

import { dispatchPending } from '@/lib/notify';

function authorised(req: NextApiRequest): boolean {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET ?? null;
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const header = req.headers['x-cron-secret'];
  if (!header) return false;
  if (Array.isArray(header)) {
    return header.some((value) => value === secret);
  }
  return header === secret;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!authorised(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return dispatchPending(req, res);
}
