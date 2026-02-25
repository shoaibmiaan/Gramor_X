// lib/writing/progress.ts
// Helpers for computing writing progress deltas and chart friendly data.

import type { WritingCriterion } from '@/types/writing';
import type { CriterionDelta, WritingProgressPoint } from '@/types/analytics';

const CRITERIA: WritingCriterion[] = [
  'task_response',
  'coherence_and_cohesion',
  'lexical_resource',
  'grammatical_range',
];

export const sortProgressPoints = (points: WritingProgressPoint[]): WritingProgressPoint[] => {
  return [...points].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const computeCriterionDeltas = (points: WritingProgressPoint[]): CriterionDelta[] => {
  if (points.length === 0) return [];
  const sorted = sortProgressPoints(points);
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const deltas: CriterionDelta[] = [];
  const previousBands = previous?.bandScores ?? null;

  for (const criterion of CRITERIA) {
    const currentValue = latest.bandScores[criterion] ?? 0;
    const prevValue = previousBands?.[criterion] ?? null;
    const delta = prevValue === null ? 0 : Number((currentValue - prevValue).toFixed(1));
    deltas.push({
      criterion,
      current: currentValue,
      previous: prevValue,
      delta,
    });
  }

  const currentOverall = latest.overallBand;
  const previousOverall = previous ? previous.overallBand : null;
  const overallDelta = previousOverall === null ? 0 : Number((currentOverall - previousOverall).toFixed(1));
  deltas.push({
    criterion: 'overall',
    current: currentOverall,
    previous: previousOverall,
    delta: overallDelta,
  });

  return deltas;
};

export const trimProgressPoints = (points: WritingProgressPoint[], limit = 3) => {
  const sorted = sortProgressPoints(points);
  return sorted.slice(Math.max(0, sorted.length - limit));
};
