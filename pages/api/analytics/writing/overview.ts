import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import type { WritingOverview, WeeklySeries, WeeklySeriesPoint } from '@/types/analytics';
import type { WritingCriterion } from '@/types/writing';

const CACHE_TTL_MS = 60_000;
const DEFAULT_WEEKS = 8;
const MIN_WEEKS = 4;
const MAX_WEEKS = 52;

type Dependencies = {
  getClient: typeof getServerClient;
};

const dependencies: Dependencies = {
  getClient: getServerClient,
};

const CRITERIA: WritingCriterion[] = [
  'task_response',
  'coherence_and_cohesion',
  'lexical_resource',
  'grammatical_range',
];

type ApiSuccess = {
  ok: true;
  generatedAt: string;
  overview: WritingOverview;
  weekly: WeeklySeries;
  cached?: boolean;
};

type ApiError = { ok: false; error: string };

type ApiResponse = ApiSuccess | ApiError;

type CacheEntry = { expiresAt: number; payload: ApiSuccess };

type ResponseRow = {
  id: string;
  exam_attempt_id: string | null;
  overall_band: number | null;
  band_scores: Record<string, number> | null;
  word_count: number | null;
  duration_seconds: number | null;
  submitted_at: string | null;
  created_at: string;
};

type AttemptAggregate = {
  attemptId: string;
  submittedAt: string | null;
  count: number;
  totalOverall: number;
  totalWords: number;
  totalDuration: number;
  bandTotals: Record<WritingCriterion, number>;
};

type WeeklyBucket = {
  weekStart: string;
  attempts: number;
  totalOverall: number;
  totalWords: number;
};

const cache = new Map<string, CacheEntry>();

export function __setAnalyticsWritingOverviewTestOverrides(overrides: Partial<Dependencies>) {
  if (process.env.NODE_ENV !== 'test') return;
  if (overrides.getClient) {
    dependencies.getClient = overrides.getClient;
  }
}

export function __resetAnalyticsWritingOverviewTestOverrides() {
  dependencies.getClient = getServerClient;
}

export function __clearAnalyticsWritingOverviewCache() {
  cache.clear();
}

function clampWeeks(raw: unknown): number {
  const value = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_WEEKS;
  const rounded = Math.round(value);
  return Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, rounded));
}

function cacheKey(userId: string, weeks: number) {
  return `${userId}::${weeks}`;
}

function startOfWeekUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon ...
  const diff = day === 0 ? 6 : day - 1; // offset to Monday
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

function formatWeekLabel(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  } catch {
    return iso.slice(0, 10);
  }
}

function computeAggregates(rows: ResponseRow[]): { overview: WritingOverview; weekly: WeeklySeries } {
  const attempts = new Map<string, AttemptAggregate>();

  for (const row of rows) {
    const attemptId = row.exam_attempt_id ?? row.id;
    const submittedAt = row.submitted_at ?? row.created_at;
    const bandScores = (row.band_scores ?? {}) as Record<string, number>;
    const overall = Number(row.overall_band ?? bandScores.overall ?? 0);
    const wordCount = Number(row.word_count ?? 0);
    const durationSeconds = Number(row.duration_seconds ?? 0);

    let aggregate = attempts.get(attemptId);
    if (!aggregate) {
      aggregate = {
        attemptId,
        submittedAt,
        count: 0,
        totalOverall: 0,
        totalWords: 0,
        totalDuration: 0,
        bandTotals: {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
      } satisfies AttemptAggregate;
      attempts.set(attemptId, aggregate);
    }

    if (!aggregate.submittedAt || submittedAt > aggregate.submittedAt) {
      aggregate.submittedAt = submittedAt;
    }

    if (Number.isFinite(overall)) aggregate.totalOverall += overall;
    if (Number.isFinite(wordCount)) aggregate.totalWords += wordCount;
    if (Number.isFinite(durationSeconds)) aggregate.totalDuration += durationSeconds;

    for (const criterion of CRITERIA) {
      const value = Number(bandScores?.[criterion] ?? 0);
      if (Number.isFinite(value)) {
        aggregate.bandTotals[criterion] += value;
      }
    }

    aggregate.count += 1;
  }

  const attemptSummaries = Array.from(attempts.values()).map((attempt) => {
    const divisor = attempt.count > 0 ? attempt.count : 1;
    const bandAverages: Record<WritingCriterion, number> = {
      task_response: attempt.bandTotals.task_response / divisor,
      coherence_and_cohesion: attempt.bandTotals.coherence_and_cohesion / divisor,
      lexical_resource: attempt.bandTotals.lexical_resource / divisor,
      grammatical_range: attempt.bandTotals.grammatical_range / divisor,
    };

    return {
      attemptId: attempt.attemptId,
      submittedAt: attempt.submittedAt,
      averageOverall: attempt.totalOverall / divisor,
      averageDuration: attempt.totalDuration / divisor,
      totalWords: attempt.totalWords,
      bandAverages,
    };
  });

  const totalAttempts = attemptSummaries.length;
  const totalWords = attemptSummaries.reduce((acc, item) => acc + item.totalWords, 0);
  const durationSum = attemptSummaries.reduce((acc, item) => acc + item.averageDuration, 0);
  const overallSum = attemptSummaries.reduce((acc, item) => acc + item.averageOverall, 0);

  const criterionSums: Record<WritingCriterion, number> = {
    task_response: 0,
    coherence_and_cohesion: 0,
    lexical_resource: 0,
    grammatical_range: 0,
  };

  attemptSummaries.forEach((item) => {
    for (const criterion of CRITERIA) {
      criterionSums[criterion] += item.bandAverages[criterion];
    }
  });

  const lastAttemptAt = attemptSummaries.reduce<string | null>((latest, item) => {
    if (!item.submittedAt) return latest;
    if (!latest || item.submittedAt > latest) return item.submittedAt;
    return latest;
  }, null);

  const overview: WritingOverview = {
    totalAttempts,
    totalWords,
    averageOverallBand: totalAttempts ? Number((overallSum / totalAttempts).toFixed(2)) : 0,
    averageTaskResponseBand: totalAttempts
      ? Number((criterionSums.task_response / totalAttempts).toFixed(2))
      : 0,
    averageCoherenceBand: totalAttempts
      ? Number((criterionSums.coherence_and_cohesion / totalAttempts).toFixed(2))
      : 0,
    averageLexicalBand: totalAttempts
      ? Number((criterionSums.lexical_resource / totalAttempts).toFixed(2))
      : 0,
    averageGrammarBand: totalAttempts
      ? Number((criterionSums.grammatical_range / totalAttempts).toFixed(2))
      : 0,
    averageWordCount: totalAttempts ? Math.round(totalWords / totalAttempts) : null,
    averageDurationSeconds: totalAttempts ? Math.round(durationSum / totalAttempts) : null,
    lastAttemptAt,
  };

  const weeklyBuckets = new Map<string, WeeklyBucket>();
  attemptSummaries.forEach((item) => {
    const submittedAt = item.submittedAt ?? new Date().toISOString();
    const weekStart = startOfWeekUtc(submittedAt);
    const bucket = weeklyBuckets.get(weekStart) ?? {
      weekStart,
      attempts: 0,
      totalOverall: 0,
      totalWords: 0,
    };

    bucket.attempts += 1;
    bucket.totalOverall += item.averageOverall;
    bucket.totalWords += item.totalWords;

    weeklyBuckets.set(weekStart, bucket);
  });

  const points: WeeklySeriesPoint[] = Array.from(weeklyBuckets.values())
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((bucket) => ({
      weekStart: bucket.weekStart,
      label: formatWeekLabel(bucket.weekStart),
      attempts: bucket.attempts,
      averageBand: bucket.attempts
        ? Number((bucket.totalOverall / bucket.attempts).toFixed(2))
        : 0,
      averageWordCount: bucket.attempts ? Math.round(bucket.totalWords / bucket.attempts) : 0,
    }));

  const weekly: WeeklySeries = {
    points,
    totalAttempts,
  };

  return { overview, weekly };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabase = dependencies.getClient(req, res);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const weeks = clampWeeks(req.query.weeks);
  const key = cacheKey(user.id, weeks);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.status(200).json({ ...cached.payload, cached: true });
  }

  const now = new Date();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - weeks * 7);
  const sinceIso = since.toISOString();

  try {
    const { data, error } = await supabase
      .from('writing_responses')
      .select(
        'id, exam_attempt_id, overall_band, band_scores, word_count, duration_seconds, submitted_at, created_at',
      )
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      // uses writing_responses_user_submitted_idx (user_id, submitted_at desc)
      .gte('submitted_at', sinceIso)
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .limit(Math.max(weeks * 20, 50));

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as ResponseRow[];
    const { overview, weekly } = computeAggregates(rows);

    const payload: ApiSuccess = {
      ok: true,
      generatedAt: now.toISOString(),
      overview,
      weekly,
    };

    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, payload });

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[analytics/writing/overview] failed', error);
    return res.status(500).json({ ok: false, error: 'Failed to load writing analytics' });
  }
}
