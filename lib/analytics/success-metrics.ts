// lib/analytics/success-metrics.ts
// Aggregate core product success metrics used in Phase 7 dashboards and guardrails.

import { getActiveDayISO } from '@/lib/daily-learning-time';

export type ReviewEventInput = {
  userId: string | null;
  event: 'open' | 'complete';
  occurredAt: string;
};

export type WordLogInput = {
  userId: string;
  learnedOn: string;
};

export type AssignmentInput = {
  userId: string;
  variant: string;
};

export type CollocationAttemptInput = {
  userId: string | null;
  attempts: number;
  correct: number;
  attemptedAt: string;
};

export type VocabXpEventInput = {
  userId: string;
  amount: number;
  createdAt: string;
  meta: Record<string, unknown> | null | undefined;
};

export interface SuccessMetricsSnapshot {
  generatedAt: string;
  dauReviewCompletionRate: number;
  avgReviewsPerUserPerDay: number;
  wordsMasteredPerWeek: number;
  retention: {
    controlRate: number | null;
    variantRate: number | null;
    uplift: number | null;
    baselineSample: number;
    window: {
      baselineStart: string;
      baselineEnd: string;
      currentStart: string;
      currentEnd: string;
    };
  };
  collocationAccuracy: {
    recent: number | null;
    previous: number | null;
    delta: number | null;
  };
  vocabulary: VocabularyMetrics;
  guardrails: Array<{
    metric: string;
    value: number | null;
    target: string;
    ok: boolean;
  }>;
}

export interface SuccessMetricInputs {
  now?: Date;
  reviewEvents: ReviewEventInput[];
  wordsLearned: WordLogInput[];
  assignments: AssignmentInput[];
  collocationAttempts: CollocationAttemptInput[];
  xpEvents?: VocabXpEventInput[];
}

export type VocabularyMetrics = {
  activeLearnersToday: number;
  meaningCorrectRate: number | null;
  sentenceAverageScore: number | null;
  synonymsAverageScore: number | null;
  synonymsAverageAccuracy: number | null;
  xpAwardedToday: number;
};

const DAY_MS = 86_400_000;

function toDayKey(value: string): string {
  return value.slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

function dateRange(now: Date, days: number): { start: Date; end: Date } {
  const end = new Date(now);
  const start = new Date(now.getTime() - (days - 1) * DAY_MS);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function isWithin(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function normaliseDate(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

export function computeSuccessMetrics(inputs: SuccessMetricInputs): SuccessMetricsSnapshot {
  const now = inputs.now ? new Date(inputs.now) : new Date();
  const generatedAt = now.toISOString();

  const reviewByDay = new Map<string, { openers: Set<string>; completers: Set<string> }>();

  inputs.reviewEvents.forEach((event) => {
    const day = toDayKey(event.occurredAt);
    if (!reviewByDay.has(day)) {
      reviewByDay.set(day, { openers: new Set(), completers: new Set() });
    }
    const bucket = reviewByDay.get(day)!;
    if (event.event === 'open' && event.userId) {
      bucket.openers.add(event.userId);
    }
    if (event.event === 'complete' && event.userId) {
      bucket.completers.add(event.userId);
    }
  });

  const latestDay = Array.from(reviewByDay.keys()).sort().pop();
  const latestBucket = latestDay ? reviewByDay.get(latestDay) : null;
  const dauReviewCompletionRate = latestBucket
    ? clamp(
        safeDivide(latestBucket.completers.size, Math.max(1, latestBucket.openers.size)) ?? 0,
        0,
        1,
      )
    : 0;

  const sevenDaysAgo = new Date(now.getTime() - 6 * DAY_MS);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  const reviewCompletions = inputs.reviewEvents.filter(
    (event) => event.event === 'complete' && normaliseDate(event.occurredAt) >= sevenDaysAgo,
  );

  const reviewPerUserDay = new Map<string, number>();
  reviewCompletions.forEach((event) => {
    if (!event.userId) return;
    const key = `${event.userId}|${toDayKey(event.occurredAt)}`;
    reviewPerUserDay.set(key, (reviewPerUserDay.get(key) ?? 0) + 1);
  });
  const totalCompletions = Array.from(reviewPerUserDay.values()).reduce((sum, count) => sum + count, 0);
  const avgReviewsPerUserPerDay = reviewPerUserDay.size
    ? totalCompletions / reviewPerUserDay.size
    : 0;

  const wordsWindowStart = new Date(now.getTime() - 6 * DAY_MS);
  wordsWindowStart.setUTCHours(0, 0, 0, 0);
  const recentWords = inputs.wordsLearned.filter(
    (entry) => normaliseDate(entry.learnedOn) >= wordsWindowStart,
  );
  const wordTotalsByUser = new Map<string, number>();
  recentWords.forEach((row) => {
    wordTotalsByUser.set(row.userId, (wordTotalsByUser.get(row.userId) ?? 0) + 1);
  });
  const wordsMasteredPerWeek = wordTotalsByUser.size
    ? recentWords.length / wordTotalsByUser.size
    : 0;

  const assignments = new Map<string, string>();
  inputs.assignments.forEach((row) => {
    assignments.set(row.userId, row.variant);
  });

  const baselineRange = dateRange(new Date(now.getTime() - 7 * DAY_MS), 7);
  const currentRange = dateRange(now, 7);

  type RetentionAccumulator = {
    baseline: Set<string>;
    retained: Set<string>;
  };

  const retentionMap = new Map<string, RetentionAccumulator>();
  inputs.wordsLearned.forEach((row) => {
    const variant = assignments.get(row.userId) ?? 'control';
    if (!retentionMap.has(variant)) {
      retentionMap.set(variant, { baseline: new Set(), retained: new Set() });
    }
    const bucket = retentionMap.get(variant)!;
    const date = normaliseDate(row.learnedOn);
    if (isWithin(date, baselineRange.start, baselineRange.end)) {
      bucket.baseline.add(row.userId);
    }
    if (isWithin(date, currentRange.start, currentRange.end) && bucket.baseline.has(row.userId)) {
      bucket.retained.add(row.userId);
    }
  });

  const control = retentionMap.get('control');
  const variant = Array.from(retentionMap.entries()).find(([key]) => key !== 'control');

  const controlRate = control
    ? safeDivide(control.retained.size, Math.max(1, control.baseline.size))
    : null;
  const variantRate = variant
    ? safeDivide(variant[1].retained.size, Math.max(1, variant[1].baseline.size))
    : null;
  const uplift = controlRate != null && variantRate != null ? variantRate - controlRate : null;

  const twentyEightDaysAgo = new Date(now.getTime() - 27 * DAY_MS);
  twentyEightDaysAgo.setUTCHours(0, 0, 0, 0);
  const fourteenDaysAgo = new Date(now.getTime() - 13 * DAY_MS);
  fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

  const collocationRecent = inputs.collocationAttempts.filter((attempt) => {
    const date = normaliseDate(attempt.attemptedAt);
    return isWithin(date, fourteenDaysAgo, currentRange.end);
  });

  const collocationPrevious = inputs.collocationAttempts.filter((attempt) => {
    const date = normaliseDate(attempt.attemptedAt);
    return isWithin(date, twentyEightDaysAgo, new Date(fourteenDaysAgo.getTime() - DAY_MS));
  });

  const recentAttempts = collocationRecent.reduce(
    (acc, row) => ({ attempts: acc.attempts + row.attempts, correct: acc.correct + row.correct }),
    { attempts: 0, correct: 0 },
  );
  const previousAttempts = collocationPrevious.reduce(
    (acc, row) => ({ attempts: acc.attempts + row.attempts, correct: acc.correct + row.correct }),
    { attempts: 0, correct: 0 },
  );

  const recentAccuracy = safeDivide(recentAttempts.correct, Math.max(1, recentAttempts.attempts));
  const previousAccuracy = safeDivide(previousAttempts.correct, Math.max(1, previousAttempts.attempts));
  const collocationDelta =
    recentAccuracy != null && previousAccuracy != null ? recentAccuracy - previousAccuracy : null;

  const vocabulary = computeVocabularyMetrics(inputs, now);

  const guardrails: SuccessMetricsSnapshot['guardrails'] = [
    {
      metric: 'Review completion rate',
      value: dauReviewCompletionRate,
      target: '≥ 0.55',
      ok: dauReviewCompletionRate >= 0.55,
    },
    {
      metric: 'Reviews per user per day',
      value: avgReviewsPerUserPerDay,
      target: '≥ 12',
      ok: avgReviewsPerUserPerDay >= 12,
    },
    {
      metric: '7-day retention uplift',
      value: uplift,
      target: '+8–12% vs baseline',
      ok: uplift != null ? uplift >= 0.08 : false,
    },
    {
      metric: 'Words mastered per week',
      value: wordsMasteredPerWeek,
      target: '≥ 18',
      ok: wordsMasteredPerWeek >= 18,
    },
    {
      metric: 'Collocation accuracy delta',
      value: collocationDelta,
      target: '+0.15 in 2 weeks',
      ok: collocationDelta != null ? collocationDelta >= 0.15 : false,
    },
  ];

  return {
    generatedAt,
    dauReviewCompletionRate,
    avgReviewsPerUserPerDay,
    wordsMasteredPerWeek,
    retention: {
      controlRate: controlRate ?? null,
      variantRate: variantRate ?? null,
      uplift,
      baselineSample: control?.baseline.size ?? 0,
      window: {
        baselineStart: baselineRange.start.toISOString(),
        baselineEnd: baselineRange.end.toISOString(),
        currentStart: currentRange.start.toISOString(),
        currentEnd: currentRange.end.toISOString(),
      },
    },
    collocationAccuracy: {
      recent: recentAccuracy,
      previous: previousAccuracy,
      delta: collocationDelta,
    },
    vocabulary,
    guardrails,
  };
}

function computeVocabularyMetrics(inputs: SuccessMetricInputs, now: Date): VocabularyMetrics {
  const todayIso = getActiveDayISO(now);
  const activeLearners = new Set<string>();

  inputs.wordsLearned
    .filter((row) => toDayKey(row.learnedOn) === todayIso)
    .forEach((row) => {
      if (row.userId) activeLearners.add(row.userId);
    });

  const xpEvents = inputs.xpEvents ?? [];

  let xpAwardedToday = 0;
  let meaningAttempts = 0;
  let meaningCorrect = 0;
  let sentenceSamples = 0;
  let sentenceScoreSum = 0;
  let synonymSamples = 0;
  let synonymScoreSum = 0;
  let synonymAccuracySum = 0;

  xpEvents.forEach((event) => {
    const eventDay = getActiveDayISO(new Date(event.createdAt));
    if (eventDay === todayIso) {
      xpAwardedToday += Number(event.amount ?? 0);
    }

    const meta = event.meta ?? {};
    const kindRaw = meta?.kind ?? null;
    const kind = typeof kindRaw === 'string' ? kindRaw : null;

    if (kind === 'meaning') {
      meaningAttempts += 1;
      const correct = typeof meta?.correct === 'boolean' ? meta.correct : Boolean(meta?.correct);
      if (correct) meaningCorrect += 1;
    } else if (kind === 'sentence') {
      const score = Number((meta as any)?.score ?? NaN);
      if (Number.isFinite(score)) {
        sentenceSamples += 1;
        sentenceScoreSum += score;
      }
    } else if (kind === 'synonyms') {
      const score = Number((meta as any)?.score ?? NaN);
      if (Number.isFinite(score)) {
        synonymSamples += 1;
        synonymScoreSum += score;
      }
      const accuracy = Number((meta as any)?.accuracy ?? NaN);
      if (Number.isFinite(accuracy)) {
        synonymAccuracySum += accuracy;
      } else if (synonymSamples > 0) {
        // Keep counts aligned when accuracy is missing
        synonymAccuracySum += 0;
      }
    }
  });

  const meaningCorrectRate = meaningAttempts > 0 ? meaningCorrect / meaningAttempts : null;
  const sentenceAverageScore = sentenceSamples > 0 ? sentenceScoreSum / sentenceSamples : null;
  const synonymsAverageScore = synonymSamples > 0 ? synonymScoreSum / synonymSamples : null;
  const synonymsAverageAccuracy = synonymSamples > 0 ? synonymAccuracySum / synonymSamples : null;

  return {
    activeLearnersToday: activeLearners.size,
    meaningCorrectRate,
    sentenceAverageScore,
    synonymsAverageScore,
    synonymsAverageAccuracy,
    xpAwardedToday,
  };
}
