// lib/gamification/xp.ts
// Deterministic XP rules for writing attempts.

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
