import type { NextApiRequest, NextApiResponse } from 'next';
import paymentWebhook from '@/pages/api/webhooks/payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return paymentWebhook(req, res);
}
