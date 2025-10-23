// pages/api/exports/attempts.csv.ts
import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import { logAccountAudit } from '@/lib/audit';
import { loadWritingAttemptRows } from '@/lib/exports/writingAttempts';

function serialise(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const stringified = typeof value === 'number' ? value.toString() : value;
  if (/[",\n]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

async function handler(req: NextApiRequest, res: NextApiResponse, ctx: PlanGuardContext) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ipHeader = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? null;
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader;
  const userAgentHeader = req.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader ?? null;

  const orgQuery = typeof req.query.orgId === 'string' ? req.query.orgId : null;

  let scopedOrgId: string | null = null;
  if (ctx.role === 'teacher') {
    const { data: profileRow, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('active_org_id')
      .eq('id', ctx.user.id)
      .maybeSingle();

    if (profileError) {
      res.status(500).json({ error: 'Failed to resolve active organization' });
      return;
    }

    scopedOrgId = (profileRow?.active_org_id as string | null) ?? null;

    if (!scopedOrgId) {
      res.status(400).json({ error: 'Set an active organization before exporting' });
      return;
    }
  } else if (orgQuery) {
    scopedOrgId = orgQuery;
  }

  const rows = await loadWritingAttemptRows({
    limit: 10_000,
    orgId: scopedOrgId,
    includeUserIds: [ctx.user.id],
  });

  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="writing-attempts.csv"');
    res.status(200).send('attempt_id,user_id,student_name,email,plan,org_ids,average_band,task1_band,task2_band,goal_band,submitted_at\n');
    return;
  }

  const header = [
    'attempt_id',
    'user_id',
    'student_name',
    'email',
    'plan',
    'org_ids',
    'average_band',
    'task1_band',
    'task2_band',
    'goal_band',
    'submitted_at',
  ];

  const body = rows
    .map((row) =>
      [
        serialise(row.attemptId),
        serialise(row.userId),
        serialise(row.studentName),
        serialise(row.email),
        serialise(row.plan),
        serialise(row.orgIds.join(',')),
        serialise(row.averageBand ?? null),
        serialise(row.task1Band ?? null),
        serialise(row.task2Band ?? null),
        serialise(row.goalBand ?? null),
        serialise(row.submittedAt ?? null),
      ].join(','),
    )
    .join('\n');

  const csv = `${header.join(',')}\n${body}`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="writing-attempts.csv"');
  res.setHeader('X-Export-Row-Count', rows.length.toString());
  res.status(200).send(csv);

  await logAccountAudit(
    ctx.supabase,
    ctx.user.id,
    'writing_attempts_export',
    {
      rows: rows.length,
      orgId: scopedOrgId,
      format: 'csv',
    },
    { ip, userAgent },
  );
}

export default withPlan('master', handler, { allowRoles: ['teacher'] });
