import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

import { ACTIVE_LEARNING_TIMEZONE, getActiveDayISO } from '@/lib/daily-learning-time';
import type { PlanId } from '@/types/pricing';
import type { Database } from '@/types/supabase';

export type VocabXpKind = 'meaning' | 'sentence' | 'synonyms' | 'reward';

export const VOCAB_XP_RULES = {
  meaningCorrect: 10,
  sentenceBase: 15,
  sentencePerfectBonus: 5,
  synonymsMax: 10,
} as const;

export const XP_MULTIPLIER_BY_PLAN: Record<PlanId, number> = {
  free: 1,
  starter: 1.1,
  booster: 1.25,
  master: 1.5,
};

export const DAILY_VOCAB_XP_CAP = 60;

function normalizePlanId(plan: PlanId | string | null | undefined): PlanId {
  const key = (plan ?? 'free').toString().toLowerCase();
  if (key === 'starter' || key === 'booster' || key === 'master') {
    return key;
  }
  return 'free';
}

export function multiplierForPlan(plan: PlanId | string | null | undefined): number {
  const normalised = normalizePlanId(plan as PlanId | string | null | undefined);
  return XP_MULTIPLIER_BY_PLAN[normalised] ?? 1;
}

export function baseXpForMeaning(correct: boolean): number {
  return correct ? VOCAB_XP_RULES.meaningCorrect : 0;
}

export function baseXpForSentence(score: 1 | 2 | 3): number {
  return VOCAB_XP_RULES.sentenceBase + (score === 3 ? VOCAB_XP_RULES.sentencePerfectBonus : 0);
}

export type SynonymRoundInput = {
  totalTargets: number;
  netCorrect: number;
  timeMs: number;
};

export type SynonymRoundResult = {
  accuracy: number;
  score: number;
  baseXp: number;
};

export function computeSynonymRound(input: SynonymRoundInput): SynonymRoundResult {
  const safeTotal = Math.max(1, input.totalTargets);
  const accuracy = Math.max(0, Math.min(input.netCorrect, safeTotal)) / safeTotal;
  const cappedTime = Math.max(1, Math.min(input.timeMs, 180_000));
  const speed =
    cappedTime <= 20_000 ? 1 : cappedTime <= 40_000 ? 0.7 : cappedTime <= 60_000 ? 0.45 : 0.2;
  const composite = Math.min(1, Math.max(0, accuracy * 0.7 + speed * 0.3));
  const baseXp = Math.min(
    VOCAB_XP_RULES.synonymsMax,
    Math.max(0, Math.round(composite * VOCAB_XP_RULES.synonymsMax)),
  );
  const score = Math.round(composite * 100);
  return { accuracy, score, baseXp };
}

function toDayBounds(dayIso: string): { startUtc: string; endUtc: string } {
  const base = DateTime.fromISO(dayIso, { zone: ACTIVE_LEARNING_TIMEZONE });
  const startUtc = base.startOf('day').toUTC().toISO();
  const endUtc = base.endOf('day').toUTC().toISO();
  return {
    startUtc: startUtc ?? DateTime.now().startOf('day').toISO(),
    endUtc: endUtc ?? DateTime.now().endOf('day').toISO(),
  };
}

type XpEventRow = {
  user_id: string;
  amount: number;
  created_at: string;
};

async function fetchDailyTotal(
  client: SupabaseClient<Database>,
  userId: string,
  dayIso: string,
): Promise<number> {
  const { startUtc, endUtc } = toDayBounds(dayIso);
  const { data, error } = await client
    .from('xp_events')
    .select('amount, created_at')
    .eq('user_id', userId)
    .gte('created_at', startUtc)
    .lte('created_at', endUtc);

  if (error || !Array.isArray(data)) {
    return 0;
  }

  return (data as XpEventRow[]).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

async function resolvePlan(
  client: SupabaseClient<Database>,
  userId: string,
  fallback?: PlanId | null,
): Promise<PlanId> {
  if (!userId) return 'free';
  if (fallback) return normalizePlanId(fallback);

  const { data, error } = await client
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .limit(1)
    .maybeSingle<{ plan: PlanId | string | null }>();

  if (error || !data) {
    return 'free';
  }

  return normalizePlanId(data.plan);
}

type AwardXpInput = {
  client: SupabaseClient<Database>;
  userId: string;
  baseAmount: number;
  kind: VocabXpKind;
  planId?: PlanId | null;
  meta?: Record<string, unknown>;
  dayIso?: string;
  source?: string;
  logEvenIfZero?: boolean;
};

export type AwardXpResult = {
  awarded: number;
  requested: number;
  multiplier: number;
  capped: boolean;
  totalToday: number;
  dayIso: string;
};

export async function awardVocabXp({
  client,
  userId,
  baseAmount,
  kind,
  planId,
  meta,
  dayIso,
  source = 'vocab',
  logEvenIfZero = false,
}: AwardXpInput): Promise<AwardXpResult> {
  const targetDay = dayIso ?? getActiveDayISO();
  const plan = await resolvePlan(client, userId, planId);
  const multiplier = multiplierForPlan(plan);
  const requested = Math.round(baseAmount * multiplier);

  if (requested <= 0 && !logEvenIfZero) {
    return {
      awarded: 0,
      requested,
      multiplier,
      capped: false,
      totalToday: await fetchDailyTotal(client, userId, targetDay),
      dayIso: targetDay,
    };
  }

  const totalSoFar = await fetchDailyTotal(client, userId, targetDay);
  const remaining = Math.max(0, DAILY_VOCAB_XP_CAP - totalSoFar);
  const awarded = Math.min(requested, remaining);
  const capped = awarded < requested;

  if (awarded <= 0 && !logEvenIfZero) {
    return {
      awarded: 0,
      requested,
      multiplier,
      capped,
      totalToday: totalSoFar,
      dayIso: targetDay,
    };
  }

  const payloadMeta = {
    ...(meta ?? {}),
    kind,
    baseAmount,
    multiplier,
    day: targetDay,
    capped,
  };

  const { error } = await client.from('xp_events').insert({
    user_id: userId,
    source,
    amount: awarded,
    meta: payloadMeta,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    awarded,
    requested,
    multiplier,
    capped,
    totalToday: totalSoFar + awarded,
    dayIso: targetDay,
  };
}
