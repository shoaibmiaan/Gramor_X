import type { BandHistoryPoint, StudyLog } from '@/hooks/useDashboardData';

export type PredictiveProjection = {
  predictedBand: number;
  confidencePercentage: number;
  estimatedDate: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function predictiveEngine(
  bandHistory: BandHistoryPoint[],
  studyFrequency: Pick<StudyLog, 'minutes'>[],
): PredictiveProjection {
  const sorted = [...bandHistory].sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
  const latestBand = sorted.at(-1)?.band ?? 0;
  const priorBand = sorted.at(-2)?.band ?? latestBand;
  const trend = latestBand - priorBand;

  const avgMinutes =
    studyFrequency.length > 0
      ? studyFrequency.reduce((sum, item) => sum + Number(item.minutes || 0), 0) /
        studyFrequency.length
      : 0;

  const effortBoost = clamp(avgMinutes / 600, 0, 0.6);
  const projectedGain = clamp(trend * 0.8 + effortBoost, -0.2, 0.8);
  const predictedBand = clamp(latestBand + projectedGain, 0, 9);

  const confidenceFromSamples = clamp(sorted.length / 12, 0.2, 1);
  const confidenceFromConsistency = clamp(avgMinutes / 420, 0.25, 1);
  const confidencePercentage = Math.round((confidenceFromSamples * 0.6 + confidenceFromConsistency * 0.4) * 100);

  const etaDays = Math.round(clamp((Math.max(0.1, 8 - predictedBand) / Math.max(0.08, projectedGain + 0.1)) * 7, 14, 180));
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + etaDays);

  return {
    predictedBand: Number(predictedBand.toFixed(1)),
    confidencePercentage,
    estimatedDate: estimated.toISOString(),
  };
}

export default predictiveEngine;
