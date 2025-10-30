import type { NextApiRequest, NextApiResponse } from 'next';

import { invalidateFlagCache, primeClientSnapshot, resolveFlags } from '@/lib/flags';

type ResponseBody =
  | { ok: true; snapshot: Record<string, boolean> }
  | { ok: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    invalidateFlagCache();
    const snapshot = await resolveFlags();
    primeClientSnapshot(snapshot);

    return res.status(200).json({ ok: true, snapshot });
  } catch (error) {
    console.error('[api/flags/refresh] failed', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(500).json({ ok: false, error: message });
  }
}
