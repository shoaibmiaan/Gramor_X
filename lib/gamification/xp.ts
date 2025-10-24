// lib/gamification/xp.ts
// Deterministic XP rules for writing attempts and vocabulary activities.

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
};

const ONE_HOUR_SECONDS = 60 * 60;

export const VOCAB_XP_RULES = {
  meaningCorrect: 10,
  sentenceBase: 15,
  sentencePerfectBonus: 5,
  synonymsMax: 10,
} as const;

export const DAILY_VOCAB_XP_CAP = 120;

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const safeNumber = (value: unknown): number => {
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : 0;
};

const getDayBounds = (date: Date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    dayIso: start.toISOString().slice(0, 10),
  };
};

export const calculateWritingXp = (ctx: WritingXpContext): WritingXpResult => {
  let points = 20; // base award for finishing an attempt
  const reasons: string[] = ['Completed writing mock exam'];

  if (ctx.previousOverall != null && ctx.currentOverall > ctx.previousOverall) {
    points += 10;
    reasons.push('Improved overall band score');
  }

  const effectiveDuration = ctx.durationSeconds ?? (() => {
    if (!ctx.startedAt || !ctx.submittedAt) return null;
    const start = new Date(ctx.startedAt).getTime();
    const end = new Date(ctx.submittedAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    return Math.round((end - start) / 1000);
  })();

  if (effectiveDuration != null && effectiveDuration <= ONE_HOUR_SECONDS) {
    points += 5;
    reasons.push('Submitted within the 60 minute window');
  }

  return {
    points,
    reason: reasons.join(' · '),
  };
};

export const baseXpForMeaning = (correct: boolean): number => (correct ? VOCAB_XP_RULES.meaningCorrect : 0);

export const baseXpForSentence = (score: number): number => {
  const base = VOCAB_XP_RULES.sentenceBase;
  return score >= 3 ? base + VOCAB_XP_RULES.sentencePerfectBonus : base;
};

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

export const computeSynonymRound = ({ totalTargets, netCorrect, timeMs }: SynonymRoundInput): SynonymRoundResult => {
  const total = Math.max(0, totalTargets);
  const correct = clamp(netCorrect, 0, total);
  const accuracy = total > 0 ? correct / total : 0;
  const perTargetMs = total > 0 ? timeMs / total : timeMs;

  const speedBonus = perTargetMs <= 4_000 ? 20 : perTargetMs <= 7_000 ? 12 : perTargetMs <= 11_000 ? 6 : perTargetMs <= 15_000 ? 2 : 0;
  const rawScore = Math.round(accuracy * 80 + speedBonus);
  const score = clamp(rawScore, 0, 100);
  const baseXp = Math.min(VOCAB_XP_RULES.synonymsMax, Math.round(score / 10));

  return { accuracy, score, baseXp };
};

export const multiplierForPlan = (plan: string | null | undefined): number => {
  const normalised = (plan ?? '').toLowerCase();
  switch (normalised) {
    case 'starter':
      return 1.1;
    case 'booster':
      return 1.25;
    case 'master':
      return 1.5;
    default:
      return 1;
  }
};

type SupabaseLike = {
  from: (table: string) => any;
};

export type AwardVocabXpOptions = {
  client: SupabaseLike;
  userId: string;
  baseAmount: number;
  kind: string;
  meta?: Record<string, unknown> | null;
  logEvenIfZero?: boolean;
  now?: Date;
};

export type AwardVocabXpResult = {
  requested: number;
  awarded: number;
  multiplier: number;
  capped: boolean;
  totalToday: number;
  dayIso: string;
};

const fetchLearnerPlan = async (client: SupabaseLike, userId: string): Promise<string | null> => {
  try {
    const query: any = client.from('profiles').select('plan');
    const response = await query.eq('user_id', userId).limit(1).maybeSingle();
    if (response?.error) return null;
    return (response?.data?.plan as string | null | undefined) ?? null;
  } catch {
    return null;
  }
};

export const awardVocabXp = async ({
  client,
  userId,
  baseAmount,
  kind,
  meta,
  logEvenIfZero = false,
  now = new Date(),
}: AwardVocabXpOptions): Promise<AwardVocabXpResult> => {
  const bounds = getDayBounds(now);
  const eventsQuery: any = client
    .from('xp_events')
    .select('amount, created_at')
    .eq('user_id', userId)
    .gte('created_at', bounds.startIso)
    .lte('created_at', bounds.endIso);

  const eventsResponse = await eventsQuery;
  if (eventsResponse?.error) {
    throw new Error('Failed to load XP history');
  }

  const existingEvents = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
  const existingTotal = existingEvents.reduce((sum: number, event: any) => sum + safeNumber(event?.amount), 0);
  const roundedExisting = Math.round(existingTotal);

  const plan = await fetchLearnerPlan(client, userId);
  const multiplier = multiplierForPlan(plan);
  const safeBase = Math.max(0, safeNumber(baseAmount));
  const requested = Math.round(safeBase * multiplier);
  const remaining = Math.max(0, DAILY_VOCAB_XP_CAP - roundedExisting);
  const awarded = Math.max(0, Math.min(requested, remaining));
  const capped = awarded < requested;
  const currentTotal = Math.min(DAILY_VOCAB_XP_CAP, roundedExisting + awarded);

  if (awarded === 0 && !logEvenIfZero) {
    return {
      requested,
      awarded: 0,
      multiplier,
      capped,
      totalToday: Math.min(DAILY_VOCAB_XP_CAP, roundedExisting),
      dayIso: bounds.dayIso,
    };
  }

  const payloadMeta = { kind, ...(meta ?? {}) };
  const insertResponse = await client.from('xp_events').insert({
    user_id: userId,
    amount: awarded,
    created_at: now.toISOString(),
    meta: payloadMeta,
  });

  if (insertResponse?.error) {
    throw new Error('Failed to record XP event');
  }

  return {
    requested,
    awarded,
    multiplier,
    capped,
    totalToday: currentTotal,
    dayIso: bounds.dayIso,
  };
};
