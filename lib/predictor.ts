// lib/predictor.ts
// Shared predictor logic used by the API and UI experiences.

export type PredictorInput = Readonly<{
  readingWpm?: number;
  readingAccuracy?: number;
  listeningAccuracy?: number;
  speakingFluency?: number;
  speakingPronunciation?: number;
  writingTaskResponse?: number;
  writingCoherence?: number;
  writingGrammar?: number;
  writingLexical?: number;
  studyHoursPerWeek?: number;
  pastBand?: number;
}>;

export type PredictorResult = Readonly<{
  overall: number;
  breakdown: { reading: number; listening: number; speaking: number; writing: number };
  confidence: number;
  advice: string[];
}>;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const roundHalf = (x: number) => Math.round(x * 2) / 2;

export const percentToBand = (x: number, minBand = 4, maxBand = 9) => {
  const b = minBand + (clamp(x, 0, 100) / 100) * (maxBand - minBand);
  return clamp(b, minBand, maxBand);
};

export function runPredictor(raw: PredictorInput): PredictorResult {
  const study = clamp(Number(raw.studyHoursPerWeek ?? 0), 0, 60);
  const pastBand =
    raw.pastBand != null && Number.isFinite(Number(raw.pastBand))
      ? clamp(Number(raw.pastBand), 0, 9)
      : undefined;

  const wpm = clamp(Number(raw.readingWpm ?? 0), 0, 400);
  const rAcc = clamp(Number(raw.readingAccuracy ?? 0), 0, 100);
  const reading = roundHalf(percentToBand(0.6 * (wpm / 4) + 0.4 * rAcc));

  const lAcc = clamp(Number(raw.listeningAccuracy ?? 0), 0, 100);
  const listening = roundHalf(percentToBand(lAcc));

  const sFlu = clamp(Number(raw.speakingFluency ?? 0), 0, 100);
  const sPro = clamp(Number(raw.speakingPronunciation ?? 0), 0, 100);
  const speaking = roundHalf(percentToBand(0.5 * sFlu + 0.5 * sPro));

  const wTR = clamp(Number(raw.writingTaskResponse ?? 0), 0, 100);
  const wCC = clamp(Number(raw.writingCoherence ?? 0), 0, 100);
  const wGRA = clamp(Number(raw.writingGrammar ?? 0), 0, 100);
  const wLEX = clamp(Number(raw.writingLexical ?? 0), 0, 100);
  const writing = roundHalf(percentToBand((wTR + wCC + wGRA + wLEX) / 4));

  let overall = roundHalf((reading + listening + speaking + writing) / 4);

  const studyBoost =
    study >= 20
      ? 1
      : study >= 12
      ? 0.5 + ((study - 12) * (0.5 / 8))
      : study >= 8
      ? (study - 8) * (0.5 / 4)
      : 0;
  overall = roundHalf(clamp(overall + studyBoost, 0, 9));

  if (typeof pastBand === 'number') {
    overall = roundHalf(0.8 * overall + 0.2 * pastBand);
  }

  const filled =
    (raw.readingWpm != null ? 1 : 0) +
    (raw.readingAccuracy != null ? 1 : 0) +
    (raw.listeningAccuracy != null ? 1 : 0) +
    (raw.speakingFluency != null ? 1 : 0) +
    (raw.speakingPronunciation != null ? 1 : 0) +
    (raw.writingTaskResponse != null ? 1 : 0) +
    (raw.writingCoherence != null ? 1 : 0) +
    (raw.writingGrammar != null ? 1 : 0) +
    (raw.writingLexical != null ? 1 : 0) +
    (raw.studyHoursPerWeek != null ? 1 : 0) +
    (raw.pastBand != null ? 1 : 0);
  const confidence = clamp(0.3 + (filled / 11) * 0.7, 0.3, 1);

  const advice: string[] = [];
  if (reading < overall) advice.push('Increase reading speed with timed passages (target +20 WPM).');
  if (listening < overall) advice.push('Do daily listening dictations to lift accuracy by 5–10%.');
  if (speaking < overall) advice.push('Record 2-minute answers and shadow native audio for pronunciation.');
  if (writing < overall) advice.push('Practice Task-2 essays; focus on Coherence and Grammar.');
  if (study < 8) advice.push('Study at least 8–12 hours/week for faster gains.');

  return {
    overall,
    breakdown: { reading, listening, speaking, writing },
    confidence: Number(confidence.toFixed(2)),
    advice,
  };
}

export const predictorUtils = { clamp, roundHalf };

