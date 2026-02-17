// pages/api/exports/analytics.parquet.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { logAccountAudit } from '@/lib/audit';
import { loadWritingAttemptRows } from '@/lib/exports/writingAttempts';
import { writingAttemptsToParquet } from '@/lib/exports/parquet';

async function handler(req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const orgId = typeof req.query.orgId === 'string' ? req.query.orgId : null;

  const rows = await loadWritingAttemptRows({
    limit: 10_000,
    orgId,
    includeUserIds: [ctx.user.id],
  });

  const buffer = await writingAttemptsToParquet(rows);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `writing-analytics-${timestamp}.parquet`;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Export-Row-Count', rows.length.toString());
  res.status(200).send(buffer);

  const ipHeader = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
  const userAgentHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? null;

  await logAccountAudit(
    ctx.supabase,
    ctx.user.id,
    'writing_attempts_export',
    {
      rows: rows.length,
      orgId,
      format: 'parquet',
    },
    { ip, userAgent },
  );
}

export default withPlan('master', handler, { allowRoles: ['admin'] });
