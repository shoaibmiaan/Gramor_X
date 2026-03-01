import type { NextApiRequest, NextApiResponse } from 'next';

export default async function webhook(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(410).json({
    error: 'deprecated_endpoint',
    message: 'Use /api/webhooks/payment for webhook delivery.',
  });
}
