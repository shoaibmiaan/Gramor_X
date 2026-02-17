function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export type ReadingXpComputation = {
  xp: number;
  accuracy: number;
};

/**
 * Compute XP awarded for a reading mock attempt.
 * Rewards completion with a base grant and scales with accuracy + pacing bonus.
 */
export function computeReadingMockXp(
  correct: number,
  total: number,
  durationSec: number,
): ReadingXpComputation {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCorrect = clampNumber(Math.floor(correct), 0, safeTotal);
  const accuracy = clampNumber(safeCorrect / safeTotal, 0, 1);

  const base = 40;
  const accuracyBonus = Math.round(accuracy * 60); // up to +60

  const targetDuration = 3600; // 60 minutes for full mock
  const boundedDuration = clampNumber(Math.floor(durationSec), 0, targetDuration * 2);
  const pacing = boundedDuration <= 0 ? 0 : boundedDuration >= targetDuration ? 0.15 : 0.3;
  const pacingBonus = Math.round((1 - boundedDuration / Math.max(targetDuration, 1)) * pacing * 100);

  const xp = Math.max(20, base + accuracyBonus + pacingBonus);
  return { xp, accuracy };
}

/**
 * Sum total XP across attempts using the same computation as the award.
 */
export function sumReadingMockXp(
  attempts: Array<{ correct?: number | null; total?: number | null; durationSec?: number | null }>,
): number {
  if (!attempts?.length) return 0;
  return attempts.reduce((sum, attempt) => {
    const correct = Number(attempt.correct ?? 0);
    const total = Number(attempt.total ?? 0);
    const durationSec = Number(attempt.durationSec ?? 0);
    const { xp } = computeReadingMockXp(correct, total, durationSec);
    return sum + xp;
  }, 0);
}

const MIN_BAND = 4;
const MAX_BAND = 9;
const XP_PER_HALF_BAND = 200;

function clampBand(band: number): number {
  if (Number.isNaN(band) || !Number.isFinite(band)) return MIN_BAND;
  return Math.min(MAX_BAND, Math.max(MIN_BAND, Math.round(band * 10) / 10));
}

export function nextHalfBand(band: number): number {
  const clamped = clampBand(band);
  const next = Math.min(MAX_BAND, Math.max(MIN_BAND, Math.ceil(clamped * 2) / 2 + 0.5));
  return Math.round(next * 10) / 10;
}

export function resolveTargetBand(currentBand: number, goalBand?: number | null): number {
  const safeCurrent = clampBand(currentBand);
  if (goalBand != null) {
    const safeGoal = clampBand(goalBand);
    if (safeGoal > safeCurrent) return safeGoal;
  }
  return nextHalfBand(safeCurrent);
}

export function xpRequiredForBand(targetBand: number): number {
  const safeBand = clampBand(targetBand);
  const stepsFromBaseline = Math.max(0, Math.round((safeBand - MIN_BAND) * 2));
  return stepsFromBaseline * XP_PER_HALF_BAND;
}

export function xpProgressPercent(totalXp: number, requiredXp: number): number {
  if (requiredXp <= 0) return 1;
  return Math.max(0, Math.min(1, totalXp / requiredXp));
}
