// lib/gamification/xp.ts
// Vocabulary XP helpers (daily caps, multipliers) + writing achievement engine.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

import type { PlanId } from '@/types/pricing';
import { xpDailyCap } from '@/lib/plan/gates';

// ---------------------------------------------------------------------------
// Vocabulary ritual XP helpers
// ---------------------------------------------------------------------------

export const DAILY_VOCAB_XP_CAP = 60;

export const VOCAB_XP_RULES = {
  meaningCorrect: 10,
  sentenceBase: 15,
  sentencePerfectBonus: 5,
  synonymsMax: 10,
} as const;

const PLAN_MULTIPLIERS: Record<string, number> = {
  free: 1,
  starter: 1.1,
  booster: 1.25,
  master: 1.5,
};

const KARACHI_TZ = 'Asia/Karachi';

type LearningDayWindow = { startIso: string; endIso: string; dayIso: string };

const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const currentLearningDay = (now = DateTime.now()): LearningDayWindow => {
  const start = now.setZone(KARACHI_TZ).startOf('day');
  const end = start.plus({ days: 1 });
  return {
    startIso: start.toUTC().toISO(),
    endIso: end.toUTC().toISO(),
    dayIso: start.toISODate() ?? start.toFormat('yyyy-LL-dd'),
  };
};

export function multiplierForPlan(plan?: string | null): number {
  if (!plan) return 1;
  const key = plan.toLowerCase();
  return PLAN_MULTIPLIERS[key] ?? 1;
}

export function baseXpForMeaning(correct: boolean): number {
  return correct ? VOCAB_XP_RULES.meaningCorrect : 0;
}

export function baseXpForSentence(score: number): number {
  const base = VOCAB_XP_RULES.sentenceBase;
  return score >= 3 ? base + VOCAB_XP_RULES.sentencePerfectBonus : base;
}

export type SynonymRound = {
  totalTargets: number;
  netCorrect: number;
  timeMs: number;
};

export type SynonymRoundResult = {
  accuracy: number;
  score: number;
  baseXp: number;
};

export function computeSynonymRound(round: SynonymRound): SynonymRoundResult {
  const safeTotal = Math.max(1, Math.floor(round.totalTargets));
  const safeCorrect = clampNumber(Math.floor(round.netCorrect), 0, safeTotal);
  const accuracy = clampNumber(safeCorrect / safeTotal, 0, 1);

  const timeMs = Math.max(0, Math.floor(round.timeMs));
  const targetPerItemMs = 6500; // 6.5 seconds per prompt keeps bonus attainable
  const expectedDuration = safeTotal * targetPerItemMs;
  const speedRatio = expectedDuration <= 0 ? 1 : clampNumber(expectedDuration / Math.max(timeMs, 1), 0, 1.2);

  const score = Math.round(accuracy * 70 + clampNumber(speedRatio, 0, 1) * 30);
  const baseXp = Math.min(
    VOCAB_XP_RULES.synonymsMax,
    Math.max(0, Math.round(score / 10)),
  );

  return { accuracy, score, baseXp };
}

type AwardVocabXpInput = {
  client: SupabaseClient<any>;
  userId: string;
  baseAmount: number;
  kind: 'meaning' | 'sentence' | 'synonyms';
  meta?: Record<string, unknown> | null;
  logEvenIfZero?: boolean;
};

export type AwardVocabXpOutcome = {
  requested: number;
  awarded: number;
  multiplier: number;
  capped: boolean;
  totalToday: number;
  dayIso: string;
};

async function fetchPlanDetails(
  client: SupabaseClient<any>,
  userId: string,
): Promise<{ plan: PlanId; multiplier: number }> {
  try {
    const { data } = await client
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();

    const plan = (data as { plan?: string | null } | null)?.plan ?? undefined;
    return { plan: (plan as PlanId | undefined) ?? 'free', multiplier: multiplierForPlan(plan) };
  } catch {
    return { plan: 'free', multiplier: 1 };
  }
}

async function fetchExistingXp(
  client: SupabaseClient<any>,
  userId: string,
  window: LearningDayWindow,
): Promise<number> {
  try {
    const { data } = await client
      .from('xp_events')
      .select('amount, created_at')
      .eq('user_id', userId)
      .gte('created_at', window.startIso)
      .lte('created_at', window.endIso);

    return (data as Array<{ amount?: number }> | null)?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;
  } catch {
    return 0;
  }
}

export async function awardVocabXp({
  client,
  userId,
  baseAmount,
  kind,
  meta,
  logEvenIfZero = false,
}: AwardVocabXpInput): Promise<AwardVocabXpOutcome> {
  const { plan, multiplier } = await fetchPlanDetails(client, userId);
  const requested = Math.max(0, Math.round(baseAmount * multiplier));

  const window = currentLearningDay();
  const existingToday = await fetchExistingXp(client, userId, window);

  const cap = xpDailyCap(plan) ?? DAILY_VOCAB_XP_CAP;
  const remainingAllowance = Math.max(0, cap - existingToday);
  const awarded = Math.min(requested, remainingAllowance);
  const capped = awarded < requested;

  if (requested > 0 && awarded === 0 && remainingAllowance === 0) {
    try {
      await client.from('api_abuse_log').insert({
        user_id: userId,
        route: 'xp.vocab',
        hits: requested,
        window: 'daily',
      });
    } catch {
      // ignore logging issues
    }
  }

  if (awarded <= 0 && !logEvenIfZero) {
    return {
      requested,
      awarded: 0,
      multiplier,
      capped,
      totalToday: existingToday,
      dayIso: window.dayIso,
    };
  }

  const payload = {
    user_id: userId,
    amount: awarded,
    source: 'vocab',
    meta: {
      ...(meta ?? {}),
      kind,
      multiplier,
      requested,
      baseAmount,
      dayIso: window.dayIso,
    },
  };

  const { error } = await client.from('xp_events').insert(payload as any);
  if (error) {
    throw new Error(error.message ?? 'Failed to record XP');
  }

  const totalToday = Math.min(cap, existingToday + awarded);

  return {
    requested,
    awarded,
    multiplier,
    capped,
    totalToday,
    dayIso: window.dayIso,
  };
}

// ---------------------------------------------------------------------------
// Writing mock achievements
// ---------------------------------------------------------------------------

export type WritingAchievementId =
  | 'attempt_completed'
  | 'first_attempt'
  | 'personal_best'
  | 'steady_gain'
  | 'band_milestone'
  | 'pace_bonus';

export type WritingAchievement = {
  id: WritingAchievementId;
  label: string;
  points: number;
  description?: string;
};

export type WritingXpContext = {
  currentOverall: number;
  previousOverall?: number | null;
  submittedAt?: string | null;
  startedAt?: string | null;
  durationSeconds?: number | null;
};

export type WritingXpResult = {
  points: number;
  reason: string;
  achievements: WritingAchievement[];
  improvement: number;
  effectiveDuration: number | null;
};

const ONE_HOUR_SECONDS = 60 * 60;
const MINUTES_55 = 55 * 60;

const resolveEffectiveDuration = (ctx: WritingXpContext): number | null => {
  if (ctx.durationSeconds != null) {
    const seconds = Math.round(Number(ctx.durationSeconds));
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  }

  if (!ctx.startedAt || !ctx.submittedAt) return null;
  const start = new Date(ctx.startedAt).getTime();
  const end = new Date(ctx.submittedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 1000);
};

export const calculateWritingXp = (ctx: WritingXpContext): WritingXpResult => {
  const achievements: WritingAchievement[] = [];

  const baseAchievement: WritingAchievement = {
    id: 'attempt_completed',
    label: 'Completed writing mock exam',
    points: 20,
  };
  achievements.push(baseAchievement);

  if (ctx.previousOverall == null) {
    achievements.push({
      id: 'first_attempt',
      label: 'First scored attempt logged',
      points: 6,
      description: 'Welcome to the writing leaderboard!',
    });
  }

  const currentBand = Number(ctx.currentOverall ?? 0);
  const previousBand =
    ctx.previousOverall == null || Number.isNaN(Number(ctx.previousOverall))
      ? null
      : Number(ctx.previousOverall);

  const improvementRaw = previousBand == null ? 0 : currentBand - previousBand;
  const improvement = Number(improvementRaw.toFixed(2));

  if (previousBand != null && improvement > 0) {
    if (improvement >= 0.5) {
      achievements.push({
        id: 'personal_best',
        label: 'New personal best band score',
        points: 12,
        description: `Improved by ${improvement.toFixed(1)} bands`,
      });
    } else {
      achievements.push({
        id: 'steady_gain',
        label: 'Consistent improvement',
        points: 8,
        description: `Up ${improvement.toFixed(1)} bands from last attempt`,
      });
    }
  }

  if (currentBand >= 8) {
    achievements.push({
      id: 'band_milestone',
      label: 'Band 8 milestone achieved',
      points: 10,
      description: `Overall band ${currentBand.toFixed(1)}`,
    });
  } else if (currentBand >= 7) {
    achievements.push({
      id: 'band_milestone',
      label: 'Band 7 milestone achieved',
      points: 7,
      description: `Overall band ${currentBand.toFixed(1)}`,
    });
  }

  const effectiveDuration = resolveEffectiveDuration(ctx);
  if (effectiveDuration != null) {
    if (effectiveDuration <= MINUTES_55) {
      achievements.push({
        id: 'pace_bonus',
        label: 'Finished with exam-ready pacing',
        points: 6,
        description: `Submitted in ${Math.round(effectiveDuration / 60)} minutes`,
      });
    } else if (effectiveDuration <= ONE_HOUR_SECONDS) {
      achievements.push({
        id: 'pace_bonus',
        label: 'Submitted within 60 minutes',
        points: 4,
        description: `Submitted in ${Math.round(effectiveDuration / 60)} minutes`,
      });
    }
  }

  const points = achievements.reduce((sum, achievement) => sum + achievement.points, 0);
  const reason = achievements.map((achievement) => achievement.label).join(' · ');

  return {
    points,
    reason,
    achievements,
    improvement,
    effectiveDuration,
  };
};
