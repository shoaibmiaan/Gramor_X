import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { trackor } from '@/lib/analytics/trackor.server';
import { gradeReadingAttempt } from '@/lib/reading/grade';

type ReadingAttemptResult = ReturnType<typeof gradeReadingAttempt>;
type DifficultyKey = 'easy' | 'med' | 'hard';
type DifficultyBreakdown = Record<DifficultyKey, { correct: number; total: number; pct: number }>;
type ReadingAttemptOutcome = ReadingAttemptResult & { difficultyBreakdown: DifficultyBreakdown };
type AttemptCacheEntry = {
  id: string;
  slug: string;
  answers: Record<string, unknown>;
  result: ReadingAttemptOutcome;
  userId: string;
  createdAt: string;
  paper?: unknown;
  paperTitle?: string | null;
  meta?: Record<string, unknown> | null;
};

const ATTEMPT_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const attemptCache = new Map<string, AttemptCacheEntry>();
let lastPrune = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function pruneExpired(now = Date.now()) {
  if (now - lastPrune < 60_000) return; // throttle pruning to once per minute
  lastPrune = now;
  for (const [key, entry] of attemptCache.entries()) {
    const created = Date.parse(entry.createdAt);
    if (Number.isFinite(created) && now - created > ATTEMPT_CACHE_TTL_MS) {
      attemptCache.delete(key);
    }
  }
}

function rememberAttempt(entry: AttemptCacheEntry) {
  pruneExpired();
  attemptCache.set(entry.id, {
    ...entry,
    answers: cloneJson(entry.answers),
    result: cloneJson(entry.result),
    meta: entry.meta ? cloneJson(entry.meta) : null,
    paper: entry.paper ? cloneJson(entry.paper) : undefined,
  });
}

export function getAttempt(attemptId: string): AttemptCacheEntry | null {
  pruneExpired();
  const cached = attemptCache.get(attemptId);
  if (!cached) return null;
  return {
    ...cached,
    answers: cloneJson(cached.answers),
    result: cloneJson(cached.result),
    meta: cached.meta ? cloneJson(cached.meta) : null,
    paper: cached.paper ? cloneJson(cached.paper) : undefined,
  };
}

type Body = {
  slug?: string;
  passageSlug?: string;
  answers?: Record<string, unknown>;
  durationMs?: number | null;
  meta?: Record<string, unknown>;
};

function extractRationale(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;
  const candidate = obj.rationale ?? obj.explanation ?? obj.feedback ?? null;
  return typeof candidate === 'string' ? candidate : null;
}

function coerceDuration(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.round(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }

  const { slug, passageSlug, answers, durationMs, meta }: Body = req.body ?? {};
  const testSlug = (passageSlug || slug || '').trim();

  if (!testSlug) {
    return res.status(400).json({ error: 'Missing passage slug' });
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers payload must be an object' });
  }

  const { data: questionRows, error: qErr } = await supabaseAdmin
    .from('reading_questions')
    .select('id,order_no,kind,prompt,answers,options,points,rationale')
    .eq('passage_slug', testSlug)
    .order('order_no', { ascending: true });

  if (qErr) {
    return res.status(500).json({ error: qErr.message || 'Failed to load questions' });
  }

  if (!questionRows || questionRows.length === 0) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const normalizedQuestions = (questionRows ?? []).map((row: any) => {
    const options = row.options;
    const rationale = extractRationale(row.rationale ?? options);
    return {
      id: String(row.id),
      order_no:
        typeof row.order_no === 'number'
          ? row.order_no
          : Number.isFinite(Number(row.order_no))
          ? Number(row.order_no)
          : 0,
      kind: String(row.kind ?? 'short') as any,
      prompt: String(row.prompt ?? ''),
      answers: row.answers,
      options,
      points:
        typeof row.points === 'number' && !Number.isNaN(row.points)
          ? row.points
          : null,
      rationale,
    };
  });

  const questionIds = normalizedQuestions.map((row) => row.id);
  const difficultyMap = new Map<string, DifficultyKey>();

  if (questionIds.length > 0) {
    const { data: difficultyRows, error: difficultyErr } = await supabaseAdmin
      .from('reading_items')
      .select('question_id,difficulty')
      .in('question_id', questionIds);

    if (!difficultyErr && Array.isArray(difficultyRows)) {
      difficultyRows.forEach((row: any) => {
        const key = String(row.question_id);
        const diff = typeof row.difficulty === 'string' ? row.difficulty.toLowerCase() : null;
        if (diff === 'easy' || diff === 'med' || diff === 'hard') {
          difficultyMap.set(key, diff);
        }
      });
    }
  }

  const result = gradeReadingAttempt(normalizedQuestions, answers);
  const difficultyBreakdown = buildDifficultyBreakdown(result.items, difficultyMap);
  const outcome = { ...result, difficultyBreakdown };
  const attemptId = randomUUID();
  const duration = coerceDuration(durationMs);
  const summary = {
    correctCount: outcome.correctCount,
    totalQuestions: outcome.totalQuestions,
    totalPoints: outcome.totalPoints,
    earnedPoints: outcome.earnedPoints,
    percentage: outcome.percentage,
  };

  const insertPayload = {
    id: attemptId,
    user_id: user.id,
    passage_slug: testSlug,
    correct_count: outcome.correctCount,
    total_questions: outcome.totalQuestions,
    total_points: outcome.totalPoints,
    earned_points: outcome.earnedPoints,
    band: outcome.band,
    duration_ms: duration,
    answers_json: answers,
    result_json: {
      summary,
      items: outcome.items,
      breakdown: outcome.breakdown,
      difficultyBreakdown,
      meta: meta ?? null,
    },
    meta: meta ?? null,
  };

  const { error: insertError } = await supabaseAdmin
    .from('reading_responses')
    .insert(insertPayload);

  if (insertError) {
    return res.status(500).json({ error: insertError.message || 'Failed to save attempt' });
  }

  const createdAt = new Date().toISOString();

  rememberAttempt({
    id: attemptId,
    slug: testSlug,
    answers,
    result: outcome,
    userId: user.id,
    createdAt,
    paper: isRecord(meta) && meta.paper ? meta.paper : undefined,
    paperTitle:
      isRecord(meta) && typeof meta.paperTitle === 'string' ? (meta.paperTitle as string) : null,
    meta: isRecord(meta) ? (meta as Record<string, unknown>) : null,
  });

  await trackor.log('reading_attempt_submitted', {
    attempt_id: attemptId,
    user_id: user.id,
    passage_slug: testSlug,
    correct_count: outcome.correctCount,
    total_questions: outcome.totalQuestions,
    total_points: outcome.totalPoints,
    earned_points: outcome.earnedPoints,
    band: outcome.band,
    duration_ms: duration,
    percentage: outcome.percentage,
  });

  try {
    await trackor.log('grade_submitted', {
      attempt_id: attemptId,
      user_id: user.id,
      passage_slug: testSlug,
      correct_count: outcome.correctCount,
      total_questions: outcome.totalQuestions,
      earned_points: outcome.earnedPoints,
      band: outcome.band,
      percentage: outcome.percentage,
      assessment: 'reading',
    });
  } catch (error) {
    console.warn('[reading.submit] analytics failed', error);
  }

  try {
    await trackor.log('reading.accuracy.by_difficulty', {
      attempt_id: attemptId,
      user_id: user.id,
      passage_slug: testSlug,
      breakdown: difficultyBreakdown,
    });
  } catch (error) {
    console.warn('[reading.submit] difficulty analytics failed', error);
  }

  return res.status(200).json({
    attemptId,
    score: { correct: outcome.correctCount, total: outcome.totalQuestions },
    band: outcome.band,
    breakdown: outcome.breakdown,
    difficultyBreakdown,
  });
}

function fallbackDifficulty(type: string): DifficultyKey {
  const normalized = String(type || '').toLowerCase();
  if (normalized === 'matching') return 'hard';
  if (normalized === 'short') return 'hard';
  if (normalized === 'tfng' || normalized === 'ynng') return 'med';
  return 'med';
}

function buildDifficultyBreakdown(
  items: ReadingAttemptResult['items'],
  map: Map<string, DifficultyKey>,
): DifficultyBreakdown {
  const counters: Record<DifficultyKey, { correct: number; total: number }> = {
    easy: { correct: 0, total: 0 },
    med: { correct: 0, total: 0 },
    hard: { correct: 0, total: 0 },
  };

  items.forEach((item) => {
    const key = map.get(String(item.id)) ?? fallbackDifficulty(item.type);
    const bucket = counters[key];
    const points = typeof item.points === 'number' && !Number.isNaN(item.points) ? item.points : 1;
    bucket.total += points;
    if (item.isCorrect) bucket.correct += points;
  });

  const breakdown: DifficultyBreakdown = {
    easy: { correct: counters.easy.correct, total: counters.easy.total, pct: 0 },
    med: { correct: counters.med.correct, total: counters.med.total, pct: 0 },
    hard: { correct: counters.hard.correct, total: counters.hard.total, pct: 0 },
  };

  (Object.keys(breakdown) as DifficultyKey[]).forEach((key) => {
    const { correct, total } = breakdown[key];
    breakdown[key].pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  });

  return breakdown;
}
