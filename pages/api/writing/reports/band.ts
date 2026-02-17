import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan } from '@/lib/apiGuard';
import { getClientIp, getRequestId } from '@/lib/api/requestContext';
import { trackor } from '@/lib/analytics/trackor.server';
import { createRequestLogger } from '@/lib/obs/logger';
import { sendTransactionalEmail } from '@/lib/email';
import { getServerClient } from '@/lib/supabaseServer';
import { dispatchWhatsAppTask } from '@/lib/tasks/whatsapp';
import { buildBandReportPdf } from '@/lib/writing/reporting';
import { evaluateReadiness } from '@/lib/writing/readiness';
import { BandReportBody } from '@/lib/writing/schemas';

const DEFAULT_RANGE_DAYS = 7;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.gramorx.com');

type Data =
  | {
      downloadToken: string;
      reportId: string;
    }
  | { error: string; details?: unknown };

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);
  const logger = createRequestLogger('api/writing/reports/band', { requestId, clientIp });

  const parsed = BandReportBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    logger.warn('invalid band report payload', { issues: parsed.error.flatten() });
    return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
  }

  const rangeDays = parsed.data.rangeDays ?? DEFAULT_RANGE_DAYS;
  const supabase = getServerClient(req, res);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

  const [{ data: profile }, { data: attempts }, { data: drills }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, email, notification_channels, phone')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('writing_attempts')
      .select('id, created_at, overall_band, scores_json, writing_prompts(topic)')
      .eq('user_id', user.id)
      .eq('status', 'scored')
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('writing_drill_events')
      .select('tags')
      .eq('user_id', user.id)
      .gte('completed_at', periodStart.toISOString()),
  ]);

  const readiness = await evaluateReadiness(supabase, user.id);

  const attemptSummaries = (attempts ?? []).map((row, index, arr) => {
    const prev = arr[index + 1];
    const band = row.overall_band ?? null;
    const prevBand = prev?.overall_band ?? null;
    const delta = band !== null && prevBand !== null ? band - prevBand : null;
    return {
      topic: (row.writing_prompts as { topic?: string } | null)?.topic ?? 'Prompt',
      createdAt: row.created_at,
      band,
      delta,
    };
  });

  const averageBand = attemptSummaries.length
    ? attemptSummaries.reduce((sum, attempt) => sum + (attempt.band ?? 0), 0) / attemptSummaries.length
    : null;

  const drillSummary = (drills ?? []).reduce<Record<string, number>>((acc, row) => {
    const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
    tags.forEach((tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
    });
    return acc;
  }, {});

  const pdf = await buildBandReportPdf({
    userName: profile?.full_name ?? 'Learner',
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    averageBand,
    attempts: attemptSummaries,
    drills: { total: drills?.length ?? 0, tags: drillSummary },
    readiness: { pass: readiness.pass, missing: readiness.missing },
  });

  const summary = {
    rangeDays,
    attemptCount: attemptSummaries.length,
    averageBand,
    drillCount: drills?.length ?? 0,
    readiness: readiness.pass ? 'pass' : 'fail',
  };

  const channels = new Set(parsed.data.channels ?? profile?.notification_channels ?? ['in_app']);

  const { data: reportRow, error: insertError } = await supabase
    .from('writing_band_reports')
    .insert({
      user_id: user.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      summary,
      pdf,
      channels: Array.from(channels),
    })
    .select('id, download_token')
    .single();

  if (insertError || !reportRow) {
    logger.error('failed to save band report', { error: insertError?.message, userId: user.id });
    return res.status(500).json({ error: insertError?.message ?? 'Failed to generate report' });
  }

  const downloadUrl = `${SITE_URL}/api/writing/reports/${reportRow.download_token}`;

  if (channels.has('email') && profile?.email) {
    try {
      await sendTransactionalEmail({
        to: profile.email,
        subject: 'Your GramorX writing band report is ready',
        text: `Download your report: ${downloadUrl}`,
        html: `<p>Your weekly writing band report is ready.</p><p><a href="${downloadUrl}">Download the PDF</a></p>`,
        attachments: [
          {
            filename: `band-report-${periodEnd.toISOString().slice(0, 10)}.pdf`,
            content: pdf.toString('base64'),
            mimetype: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      logger.warn('email delivery failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (channels.has('whatsapp') && profile?.phone) {
    try {
      await dispatchWhatsAppTask(supabase, {
        userId: user.id,
        type: 'task',
        message: `Your GramorX writing band report is ready. Download it here: ${downloadUrl}`,
        metadata: { reportId: reportRow.id },
      });
    } catch (error) {
      logger.warn('whatsapp dispatch failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  await supabase
    .from('writing_band_reports')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', reportRow.id);

  await trackor.log('writing_band_report_generated', {
    user_id: user.id,
    report_id: reportRow.id,
    request_id: requestId,
    ip: clientIp,
  });

  return res.status(200).json({ downloadToken: reportRow.download_token, reportId: reportRow.id });
}

export default withPlan('starter', handler, { allowRoles: ['teacher', 'admin'] });
