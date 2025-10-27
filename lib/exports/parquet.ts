// lib/exports/parquet.ts
// Utility helpers to transform writing attempt exports into Parquet buffers.

import { PassThrough } from 'node:stream';
import { finished } from 'node:stream/promises';

import { ParquetSchema, ParquetWriter } from 'parquetjs-lite';

import type { WritingAttemptExportRow } from '@/lib/exports/writingAttempts';

const ATTEMPT_SCHEMA = new ParquetSchema({
  attempt_id: { type: 'UTF8' },
  user_id: { type: 'UTF8' },
  org_ids: { type: 'UTF8', optional: true },
  plan: { type: 'UTF8', optional: true },
  submitted_at: { type: 'TIMESTAMP_MILLIS', optional: true },
  goal_band: { type: 'DOUBLE', optional: true },
  average_band: { type: 'DOUBLE', optional: true },
  task1_band: { type: 'DOUBLE', optional: true },
  task2_band: { type: 'DOUBLE', optional: true },
});

export async function writingAttemptsToParquet(rows: WritingAttemptExportRow[]): Promise<Buffer> {
  const sink = new PassThrough();
  const chunks: Buffer[] = [];
  sink.on('data', (chunk) => {
    chunks.push(Buffer.from(chunk));
  });

  const writer = await ParquetWriter.openStream(ATTEMPT_SCHEMA, sink);
  for (const row of rows) {
    await writer.append({
      attempt_id: row.attemptId,
      user_id: row.userId,
      org_ids: row.orgIds.join(','),
      plan: row.plan,
      submitted_at: row.submittedAt ? new Date(row.submittedAt) : null,
      goal_band: row.goalBand ?? null,
      average_band: row.averageBand ?? null,
      task1_band: row.task1Band ?? null,
      task2_band: row.task2Band ?? null,
    });
  }

  await writer.close();
  sink.end();
  await finished(sink);

  return Buffer.concat(chunks);
}
