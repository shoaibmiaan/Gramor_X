import type { NextApiRequest, NextApiResponse } from 'next';

import { createRequestLogger } from '@/lib/obs/logger';

type WebVitalPayload = {
  id?: string;
  name?: string;
  value?: number;
  label?: string;
  path?: string;
};

const log = createRequestLogger('/api/monitoring/web-vitals');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const payload = (req.body ?? {}) as WebVitalPayload;

  log.info('web_vitals_metric', {
    id: payload.id,
    name: payload.name,
    value: payload.value,
    label: payload.label,
    path: payload.path,
    userAgent: req.headers['user-agent'] ?? null,
  });

  return res.status(200).json({ ok: true });
}
