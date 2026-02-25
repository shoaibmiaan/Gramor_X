// pages/api/admin/ai/vocab/usage.ts

import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { getServerClient } from '@/lib/supabaseServer';

type UsageBucket = {
  date: string;
  total_requests: number;
  unique_users: number;
};

type Data =
  | {
      ok: true;
      summary: {
        window: '7d';
        buckets: UsageBucket[];
      };
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/admin/ai/vocab/usage', { requestId, clientIp });
  const startedAt = Date.now();

  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.warn('unauthorised vocab usage fetch', { reason: userError?.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Admin-only guard – adjust roles if you have a role column somewhere else.
  // Here I’m assuming you store role in user_metadata.role or in a "role" claim.
  const role = (user.user_metadata as any)?.role ?? (user.app_metadata as any)?.role;
  if (role !== 'admin' && role !== 'teacher') {
    logger.warn('forbidden vocab usage fetch', { userId: user.id, role });
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ⚠️ For now we return a safe dummy structure so nothing crashes.
    // Later you can replace this block with a real query, e.g.:
    // const { data, error } = await supabase
    //   .from('ai_vocab_usage_daily')
    //   .select('date, total_requests, unique_users')
    //   .gte('date', someFromDate);

    const today = new Date();
    const buckets: UsageBucket[] = [];

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);

      buckets.push({
        date: iso,
        total_requests: 0,
        unique_users: 0,
      });
    }

    const latency = Date.now() - startedAt;
    logger.info('vocab usage summary served', {
      userId: user.id,
      role,
      latencyMs: latency,
      bucketCount: buckets.length,
    });

    await trackor.log('admin_vocab_usage_viewed', {
      user_id: user.id,
      role,
      latency_ms: latency,
      request_id: requestId,
      ip: clientIp,
    });

    return res.status(200).json({
      ok: true,
      summary: {
        window: '7d',
        buckets,
      },
    });
  } catch (err: any) {
    logger.error('vocab usage fetch failed', {
      error: err?.message ?? String(err),
      userId: user.id,
    });

    return res.status(500).json({
      error: 'Failed to load vocab usage',
      details: err?.message ?? String(err),
    });
  }
}

// Admin / teacher only, still behind `withPlan` in case you gate admin tools.
export default withPlan('free', handler, { allowRoles: ['teacher', 'admin'] });
