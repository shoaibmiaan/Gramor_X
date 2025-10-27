// lib/analytics/writing-events.ts
// Centralised helpers for writing module analytics events.

import { track } from '@/lib/analytics/track';

export type WritingAnalyticsViewSource = 'route' | 'load';
export type WritingShareMethod = 'web-share' | 'clipboard' | 'fallback';
export type WritingShareStatus = 'shared' | 'copied' | 'error';

const formatBand = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(1));
};

export function logWritingAnalyticsView({
  source,
  weeks,
  attempts,
  cached,
}: {
  source: WritingAnalyticsViewSource;
  weeks?: number;
  attempts?: number;
  cached?: boolean;
}) {
  track('analytics.writing.view', {
    source,
    weeks,
    attempts,
    cached: cached ? 1 : 0,
  });
}

export function logWritingAnalyticsTrendChange({
  weeks,
  attempts,
  source,
}: {
  weeks: number;
  attempts?: number;
  source?: 'chart' | 'filter';
}) {
  track('analytics.writing.trend', {
    weeks,
    attempts,
    source,
  });
}

export function logWritingProgressChartViewed({ attempts }: { attempts: number }) {
  track('analytics.progress.view', { attempts });
}

export function logWritingResultsView({
  attemptId,
  tasks,
  averageBand,
}: {
  attemptId: string;
  tasks: number;
  averageBand: number;
}) {
  track('writing.results.view', {
    attempt_id: attemptId,
    tasks,
    average_band: formatBand(averageBand),
  });
}

export function logWritingResultsAnalyticsClick({ attemptId }: { attemptId: string }) {
  track('writing.results.analytics_click', { attempt_id: attemptId });
}

export function logWritingResultsShare({
  attemptId,
  method,
  status,
}: {
  attemptId: string;
  method: WritingShareMethod;
  status: WritingShareStatus;
}) {
  track('writing.results.share', {
    attempt_id: attemptId,
    method,
    status,
  });
}

export function logWritingCoachEntry({
  attemptId,
  tasks,
  averageBand,
}: {
  attemptId: string;
  tasks: number;
  averageBand: number;
}) {
  track('writing.coach.entry', {
    attempt_id: attemptId,
    tasks,
    average_band: formatBand(averageBand),
  });
}
