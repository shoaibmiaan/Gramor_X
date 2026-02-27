// Helpers for picking a deterministic daily reading challenge.

/**
 * Generates a pseudo-random seed based on a user identifier and the
 * current date (year-month-day). By hashing both pieces of input we
 * ensure that every user sees a consistent challenge on a given day,
 * while different users get different challenges.
 */
export function getDailyChallengeSeed(userId: string, date: Date): number {
  const key = `${userId}-${date.toISOString().split('T')[0]}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Given a seed and the number of available items, deterministically
 * selects an index in the range [0, length-1]. If the length is zero
 * the function returns 0. This function is intentionally simple –
 * modulo ensures a roughly uniform distribution given a suitably
 * randomish seed.
 */
export function pickDailyIndex(seed: number, length: number): number {
  if (!length || length <= 0) return 0;
  return seed % length;
}
