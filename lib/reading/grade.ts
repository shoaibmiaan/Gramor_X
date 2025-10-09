import { readingBandFromRaw } from '@/lib/reading/band';

type Kind = 'tfng' | 'mcq' | 'matching' | 'short';

type QuestionRow = {
  id: string;
  order_no: number | null;
  kind: Kind;
  prompt: string;
  answers: unknown;
  options?: unknown;
  points?: number | null;
  rationale?: unknown;
};

type Breakdown = Record<string, { correct: number; total: number; pct: number }>;

type ScoreItem = {
  id: string;
  qNo: number;
  type: Kind;
  prompt: string;
  correct: unknown;
  user: unknown;
  isCorrect: boolean;
  points: number;
  rationale?: string | null;
};

type GradeResult = {
  correctCount: number;
  totalQuestions: number;
  totalPoints: number;
  earnedPoints: number;
  band: number;
  percentage: number;
  items: ScoreItem[];
  breakdown: Breakdown;
};

function normalizeText(input: unknown): string | null {
  if (input == null) return null;
  const str = String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return str || null;
}

function ensureArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function gradeReadingAttempt(
  questions: QuestionRow[],
  answers: Record<string, unknown>,
): GradeResult {
  let correctCount = 0;
  let totalQuestions = 0;
  let totalPoints = 0;
  let earnedPoints = 0;

  const breakdownCounters: Record<string, { correct: number; total: number }> = {};
  const items: ScoreItem[] = [];

  for (const row of questions) {
    const qNo = row.order_no ?? 0;
    const kind = row.kind;
    const points = typeof row.points === 'number' && !Number.isNaN(row.points) ? row.points : 1;

    totalQuestions += 1;
    totalPoints += points;
    breakdownCounters[kind] ||= { correct: 0, total: 0 };
    breakdownCounters[kind].total += 1;

    const userAnswer = answers?.[row.id];
    const correctValue = ensureArray(row.answers ?? []).map(v => v);
    const rationale = typeof row.rationale === 'string'
      ? row.rationale
      : row.options && typeof row.options === 'object'
        ? (() => {
            const opts = row.options as Record<string, any>;
            const candidate = opts?.rationale ?? opts?.explanation ?? opts?.feedback ?? null;
            return typeof candidate === 'string' ? candidate : null;
          })()
        : null;

    let isCorrect = false;

    if (kind === 'tfng' || kind === 'mcq') {
      const expected = correctValue.length > 0 ? correctValue[0] : null;
      const normalizedExpected = normalizeText(expected);
      const normalizedUser = normalizeText(userAnswer);
      isCorrect = normalizedExpected !== null && normalizedExpected === normalizedUser;
    } else if (kind === 'short') {
      const candidates = correctValue.map(v => normalizeText(v)).filter((v): v is string => v != null);
      const normalizedUser = normalizeText(userAnswer);
      isCorrect = normalizedUser != null && candidates.includes(normalizedUser);
    } else if (kind === 'matching') {
      const expected = ensureArray(correctValue).map(v => (v == null ? '' : String(v)));
      const normalizedExpected = expected.map(v => normalizeText(v));
      const userList = ensureArray(userAnswer).map(v => (v == null ? '' : String(v)));
      const normalizedUser = userList.map(v => normalizeText(v));
      isCorrect =
        normalizedExpected.length > 0 &&
        normalizedExpected.length === normalizedUser.length &&
        normalizedExpected.every((val, idx) => val != null && val === normalizedUser[idx]);
    }

    if (isCorrect) {
      correctCount += 1;
      earnedPoints += points;
      breakdownCounters[kind].correct += 1;
    }

    items.push({
      id: row.id,
      qNo,
      type: kind,
      prompt: row.prompt,
      correct:
        kind === 'matching'
          ? ensureArray(row.answers ?? [])
          : correctValue.length > 1
          ? correctValue
          : correctValue[0] ?? null,
      user: userAnswer ?? null,
      isCorrect,
      points,
      rationale,
    });
  }

  const band = readingBandFromRaw(correctCount, totalQuestions);
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const breakdown: Breakdown = Object.fromEntries(
    Object.entries(breakdownCounters).map(([type, counts]) => [
      type,
      {
        correct: counts.correct,
        total: counts.total,
        pct: counts.total > 0 ? Math.round((counts.correct / counts.total) * 100) : 0,
      },
    ]),
  );

  return {
    correctCount,
    totalQuestions,
    totalPoints,
    earnedPoints,
    band,
    percentage,
    items,
    breakdown,
  };
}

export type { GradeResult, ScoreItem };
