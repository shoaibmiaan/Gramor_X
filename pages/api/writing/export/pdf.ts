// pages/api/writing/export/pdf.ts
// Generates a lightweight PDF summary for a writing attempt.

import type { NextApiRequest, NextApiResponse } from 'next';

import { withPlan, type PlanGuardContext } from '@/lib/api/withPlan';
import type { WritingScorePayload } from '@/types/writing';

const escapePdf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function buildPdf(lines: string[]): Buffer {
  const content = lines
    .slice(0, 30)
    .map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 20} Td (${escapePdf(line)}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];

  const header = '%PDF-1.4';
  const segments = [header];
  const xref: string[] = [];
  let offset = header.length + 1;
  xref.push('0000000000 65535 f ');

  for (const object of objects) {
    segments.push(object);
    const record = `${offset.toString().padStart(10, '0')} 00000 n `;
    xref.push(record);
    offset += object.length + 1;
  }

  const xrefStart = offset;
  segments.push('xref');
  segments.push(`0 ${objects.length + 1}`);
  segments.push(...xref);
  segments.push('trailer << /Size ' + (objects.length + 1) + ' /Root 1 0 R >>');
  segments.push('startxref');
  segments.push(String(xrefStart));
  segments.push('%%EOF');

  return Buffer.from(segments.join('\n'), 'utf8');
}

export async function writingExportHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  ctx: PlanGuardContext,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!ctx.flags.writingExports) {
    res.status(404).json({ error: 'Export unavailable' });
    return;
  }

  const attemptId = req.query.attemptId as string | undefined;
  if (!attemptId) {
    res.status(400).json({ error: 'Missing attemptId' });
    return;
  }

  const { data: attempt, error: attemptError } = await ctx.supabase
    .from('exam_attempts')
    .select('id, user_id, submitted_at, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }

  if (attempt.user_id !== ctx.user.id && ctx.role !== 'admin' && ctx.role !== 'teacher') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { data: responses, error: responseError } = await ctx.supabase
    .from('writing_responses')
    .select('task, answer_text, overall_band, band_scores, feedback')
    .eq('exam_attempt_id', attemptId);

  if (responseError) {
    res.status(500).json({ error: 'Failed to load responses' });
    return;
  }

  const scores = (responses ?? [])
    .filter((row) => row.task === 'task1' || row.task === 'task2')
    .map((row) => ({
      task: row.task,
      band: Number(row.overall_band ?? 0),
      feedback: (row.feedback as WritingScorePayload['feedback']) ?? null,
    }));

  if (scores.length === 0) {
    res.status(400).json({ error: 'Scores not ready' });
    return;
  }

  const avg = scores.reduce((sum, item) => sum + item.band, 0) / scores.length;

  const lines = [
    'GramorX Writing Report',
    `Attempt: ${attemptId}`,
    `Generated: ${new Date().toISOString()}`,
    `Average band: ${avg.toFixed(1)}`,
    '',
  ];

  scores.forEach((score) => {
    lines.push(`Task ${score.task?.toString().replace('task', '') ?? ''}: Band ${score.band.toFixed(1)}`);
    const summary = score.feedback?.summary ?? 'Feedback not available.';
    lines.push(summary.length > 140 ? `${summary.slice(0, 137)}...` : summary);
    lines.push('');
  });

  const buffer = buildPdf(lines);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="writing-${attemptId}.pdf"`);
  res.status(200).send(buffer);
}

export default withPlan('booster', writingExportHandler, {
  allowRoles: ['admin', 'teacher'],
  killSwitchFlag: 'killSwitchWriting',
});

