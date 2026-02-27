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

export function trackClientAttemptStarted({ attemptId, promptId, taskType }: { attemptId: string; promptId?: string; taskType?: string }) {
  track('writing_attempt_started', { attempt_id: attemptId, prompt_id: promptId, task_type: taskType });
}

export function trackClientAttemptSaved({ attemptId, wordCount, bulkPaste }: { attemptId: string; wordCount: number; bulkPaste?: boolean }) {
  track('writing_attempt_saved', { attempt_id: attemptId, word_count: wordCount, bulk_paste: bulkPaste ? 1 : 0 });
}

export function trackClientAttemptSubmitted({ attemptId }: { attemptId: string }) {
  track('writing_attempt_submitted', { attempt_id: attemptId });
}

export function trackClientRedraftCreated({ attemptId, sourceId }: { attemptId: string; sourceId: string }) {
  track('writing_redraft_created', { attempt_id: attemptId, source_attempt_id: sourceId });
}

export function trackClientEvidenceViewed(count: number) {
  track('writing_cross_evidence', { evidence_count: count });
}

export function trackClientHedgingViewed(count: number) {
  track('writing_cross_hedging', { suggestion_count: count });
}

export function trackClientHandwritingUploaded(legibility: number) {
  track('writing_handwriting_uploaded', { legibility });
}

export function trackClientBandReport(downloadToken: string) {
  track('writing_band_report_generated', { token: downloadToken });
}
