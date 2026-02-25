// Simple band prediction for Reading attempts.

import type { ReadingAttemptSummary } from './types';

/**
 * Computes a predicted IELTS Reading band based on past attempts. This
 * implementation simply averages the recorded band scores (or infers
 * them from raw scores if bandScore is null) and returns a band along
 * with a confidence metric between 0 and 1. More sophisticated
 * approaches could be added later.
 */
export function predictBand(
  attempts: ReadingAttemptSummary[],
): { band: number; confidence: number } {
  if (!attempts || attempts.length === 0) {
    return { band: 0, confidence: 0 };
  }
  let totalBand = 0;
  let count = 0;
  attempts.forEach((a) => {
    let band: number;
    if (typeof a.bandScore === 'number' && Number.isFinite(a.bandScore)) {
      band = a.bandScore;
    } else if (a.totalQuestions > 0) {
      // Approximate band from raw score: band = 4 + ratio * 5
      const ratio = Math.max(0, Math.min(1, a.rawScore / a.totalQuestions));
      band = 4 + ratio * 5;
    } else {
      band = 0;
    }
    totalBand += band;
    count += 1;
  });
  const avg = count > 0 ? totalBand / count : 0;
  // Confidence increases with more attempts (capped at 1)
  const confidence = Math.min(1, attempts.length / 10);
  return { band: Math.round(avg * 10) / 10, confidence };
}

// Re-export the type for convenience in component imports.
export type { ReadingAttemptSummary } from './types';
