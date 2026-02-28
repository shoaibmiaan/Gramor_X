import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
import { getDashboardAggregate } from '@/lib/services/dashboardService';
import { createDomainLogger } from '@/lib/obs/domainLogger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log = createDomainLogger('/api/dashboard/aggregate');
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const skipCache = req.query.refresh === '1';
  const aggregate = await getDashboardAggregate(supabase as any, user.id, { skipCache });
  log.info('dashboard.aggregate_fetched', { userId: user.id, aggregateFetched: true, recommendationCount: aggregate.progress.recommendationsCount, skipCache });
  return res.status(200).json({ ok: true, aggregate });
}
