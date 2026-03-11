import type { NextApiRequest, NextApiResponse } from 'next';

import { getHomeOverviewPayload } from '@/lib/home/overview';
import type { HomeOverviewPayload } from '@/types/home';

type HomeOverviewResponse =
  | { ok: true; data: HomeOverviewPayload }
  | { ok: false; error: string };

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<HomeOverviewResponse>
): void {
  try {
    res.status(200).json({ ok: true, data: getHomeOverviewPayload() });
  } catch (error) {
    console.error('Failed to produce home overview payload', error);
    res.status(500).json({ ok: false, error: 'home_overview_unavailable' });
  }
}
