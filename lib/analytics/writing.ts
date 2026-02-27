// lib/analytics/writing.ts
// Helper utilities for aggregating writing performance metrics.

import type { WritingAttemptSummary, WritingSummary } from '@/types/analytics';
import type { WritingResponse } from '@/types/writing';

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

export const computeWritingSummary = (
  responses: WritingResponse[],
  attempts: WritingAttemptSummary[] = [],
): WritingSummary => {
  const grouped = new Map<string, WritingResponse[]>();
  responses.forEach((response) => {
    const key = response.examAttemptId ?? response.attemptId ?? response.id;
    const items = grouped.get(key) ?? [];
    items.push(response);
    grouped.set(key, items);
  });

  const attemptSummaries = attempts.length
    ? attempts
    : Array.from(grouped.entries()).map(([attemptId, rows]) => ({
        attemptId,
        createdAt: rows[0]?.submittedAt ?? rows[0]?.createdAt ?? new Date().toISOString(),
        overallBand: average(
          rows
            .map((row) => row.overallBand ?? row.bandScores?.overall ?? 0)
            .filter((value) => typeof value === 'number' && !Number.isNaN(value)),
        ),
        durationSeconds: average(
          rows
            .map((row) => row.durationSeconds ?? row.metadata?.durationSeconds ?? 0)
            .filter((value) => typeof value === 'number'),
        ),
      }));

  const orderedAttempts = attemptSummaries
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const averageBand = average(orderedAttempts.map((a) => a.overallBand).filter((value) => value > 0));
  const averageDuration = average(
    orderedAttempts.map((a) => a.durationSeconds ?? 0).filter((value) => value > 0),
  );

  const totalWords = responses.reduce((acc, row) => acc + (row.wordCount ?? 0), 0);

  return {
    averageBand: Number(averageBand.toFixed(2)),
    averageDurationSeconds: Math.round(averageDuration),
    attempts: orderedAttempts,
    totalAttempts: orderedAttempts.length,
    totalWords,
  };
};
