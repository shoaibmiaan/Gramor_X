import { randomUUID } from 'crypto';

import type { SupabaseClient } from '@supabase/supabase-js';
import { queryVocabulary } from '@/lib/vocabulary/data';

export const VOCAB_QUIZ_DURATION_SECONDS = 60;
export const VOCAB_QUIZ_MIN_QUESTIONS = 10;
export const VOCAB_QUIZ_MAX_QUESTIONS = 15;

export type VocabDifficulty = 'easy' | 'medium' | 'hard';

export type VocabQuizQuestion = {
  id: string;
  wordId: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  difficulty: VocabDifficulty;
  tag: string;
};

export type PublicQuizQuestion = Omit<VocabQuizQuestion, 'correctIndex'>;

export type StartQuizPayload = {
  quizSessionId: string;
  expiresAt: string;
  durationSeconds: number;
  questions: PublicQuizQuestion[];
};

export type QuizAnswer = {
  questionId: string;
  selectedIndex: number;
  responseTimeMs: number;
};

export type QuizSubmission = {
  quizSessionId: string;
  answers: QuizAnswer[];
  elapsedMs: number;
};

export type QuizScoreBreakdown = {
  correct: number;
  total: number;
  accuracy: number;
  weightedAccuracy: number;
  avgResponseMs: number;
};

const DIFFICULTY_WEIGHT: Record<VocabDifficulty, number> = {
  easy: 1,
  medium: 1.35,
  hard: 1.7,
};

const inMemorySessions = new Map<string, {
  userId: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  questions: VocabQuizQuestion[];
}>();

function deriveDifficulty(level: string | null | undefined): VocabDifficulty {
  const normalized = String(level ?? '').toLowerCase();
  if (normalized.includes('c1') || normalized.includes('c2')) return 'hard';
  if (normalized.includes('b2') || normalized.includes('b1')) return 'medium';
  return 'easy';
}

function clampQuestions(target: number) {
  return Math.max(VOCAB_QUIZ_MIN_QUESTIONS, Math.min(VOCAB_QUIZ_MAX_QUESTIONS, target));
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistractors(headword: string, pool: string[]): string[] {
  const filtered = pool.filter((item) => item !== headword);
  return shuffle(filtered).slice(0, 3);
}

export function createQuizQuestions(targetCount = 12): VocabQuizQuestion[] {
  const count = clampQuestions(targetCount);
  const { items } = queryVocabulary({ limit: 250 });
  const source = shuffle(items).slice(0, count);

  return source.map((word, idx) => {
    const distractors = pickDistractors(word.headword, items.map((entry) => entry.headword));
    const options = shuffle([word.headword, ...distractors]);
    return {
      id: `q-${idx + 1}`,
      wordId: word.id,
      prompt: word.shortDefinition || `Select the best match for ${word.headword}`,
      options,
      correctIndex: options.findIndex((opt) => opt === word.headword),
      difficulty: deriveDifficulty(word.level),
      tag: word.level ?? 'General IELTS',
    };
  });
}

export async function startVocabQuizSession(params: {
  userId: string;
  supabase: SupabaseClient;
  questionCount?: number;
}): Promise<StartQuizPayload> {
  const questions = createQuizQuestions(params.questionCount ?? 12);
  const quizSessionId = randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + VOCAB_QUIZ_DURATION_SECONDS * 1000 + 10_000;

  inMemorySessions.set(quizSessionId, {
    userId: params.userId,
    createdAt,
    expiresAt,
    used: false,
    questions,
  });

  await params.supabase.from('quiz_events').insert({
    user_id: params.userId,
    quiz_session_id: quizSessionId,
    event_type: 'started',
    payload: { questionCount: questions.length },
  });

  return {
    quizSessionId,
    expiresAt: new Date(expiresAt).toISOString(),
    durationSeconds: VOCAB_QUIZ_DURATION_SECONDS,
    questions: questions.map(({ correctIndex, ...publicQuestion }) => publicQuestion),
  };
}

export function resolveQuizSession(userId: string, quizSessionId: string) {
  const session = inMemorySessions.get(quizSessionId);
  if (!session) return { error: 'Quiz session not found' as const };
  if (session.userId !== userId) return { error: 'Session ownership mismatch' as const };
  if (session.used) return { error: 'Session already submitted' as const };
  if (Date.now() > session.expiresAt) return { error: 'Session expired' as const };
  return { session } as const;
}

export function computeQuizScore(questions: VocabQuizQuestion[], answers: QuizAnswer[]): QuizScoreBreakdown {
  const answerById = new Map(answers.map((answer) => [answer.questionId, answer]));

  let correct = 0;
  let weightedHit = 0;
  let weightedTotal = 0;
  let responseTotal = 0;

  questions.forEach((question) => {
    const answer = answerById.get(question.id);
    const weight = DIFFICULTY_WEIGHT[question.difficulty];
    weightedTotal += weight;

    if (answer && answer.selectedIndex === question.correctIndex) {
      correct += 1;
      weightedHit += weight;
    }

    if (answer) {
      responseTotal += Math.max(0, answer.responseTimeMs);
    }
  });

  const total = questions.length;
  const answeredCount = answers.length || 1;

  return {
    correct,
    total,
    accuracy: total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0,
    weightedAccuracy: weightedTotal > 0 ? Number(((weightedHit / weightedTotal) * 100).toFixed(2)) : 0,
    avgResponseMs: Number((responseTotal / answeredCount).toFixed(0)),
  };
}

export function markQuizSessionUsed(quizSessionId: string) {
  const session = inMemorySessions.get(quizSessionId);
  if (!session) return;
  session.used = true;
  inMemorySessions.set(quizSessionId, session);
}

export async function persistPerWordPerformance(params: {
  supabase: SupabaseClient;
  userId: string;
  quizSessionId: string;
  questions: VocabQuizQuestion[];
  answers: QuizAnswer[];
}) {
  const answerById = new Map(params.answers.map((answer) => [answer.questionId, answer]));
  const now = new Date().toISOString();

  await Promise.all(params.questions.map(async (question) => {
    const answer = answerById.get(question.id);
    const isCorrect = answer ? answer.selectedIndex === question.correctIndex : false;

    await params.supabase.from('user_vocab_profile').upsert({
      user_id: params.userId,
      word_id: question.wordId,
      attempts: 1,
      correct_count: isCorrect ? 1 : 0,
      last_seen: now,
      strength_score: isCorrect ? 60 : 35,
      difficulty: question.difficulty,
      response_time_ms: answer?.responseTimeMs ?? null,
    }, { onConflict: 'user_id,word_id', ignoreDuplicates: false });
  }));
}

export type VocabInsights = {
  weakWords: Array<{ wordId: string; strengthScore: number }>;
  strongWords: Array<{ wordId: string; strengthScore: number }>;
  recommendation: string;
  level: string;
  heatmap: Array<{ date: string; attempts: number; correct: number }>;
};

export async function getVocabInsights(supabase: SupabaseClient, userId: string): Promise<VocabInsights> {
  const { data } = await supabase
    .from('user_vocab_profile')
    .select('word_id,strength_score,last_seen,correct_count,attempts')
    .eq('user_id', userId)
    .order('strength_score', { ascending: true })
    .limit(80);

  const rows = data ?? [];

  const weakWords = rows.slice(0, 5).map((row: any) => ({ wordId: String(row.word_id), strengthScore: Number(row.strength_score ?? 0) }));
  const strongWords = [...rows]
    .sort((a: any, b: any) => Number(b.strength_score ?? 0) - Number(a.strength_score ?? 0))
    .slice(0, 5)
    .map((row: any) => ({ wordId: String(row.word_id), strengthScore: Number(row.strength_score ?? 0) }));

  const heatmapBucket = new Map<string, { attempts: number; correct: number }>();
  rows.forEach((row: any) => {
    const key = String(row.last_seen ?? '').slice(0, 10);
    if (!key) return;
    const prev = heatmapBucket.get(key) ?? { attempts: 0, correct: 0 };
    heatmapBucket.set(key, {
      attempts: prev.attempts + Number(row.attempts ?? 0),
      correct: prev.correct + Number(row.correct_count ?? 0),
    });
  });

  const averageStrength = rows.length
    ? rows.reduce((sum: number, row: any) => sum + Number(row.strength_score ?? 0), 0) / rows.length
    : 0;

  return {
    weakWords,
    strongWords,
    recommendation: averageStrength < 45
      ? 'Focus on medium-frequency words and review weak terms daily.'
      : 'Move to harder IELTS C1 vocabulary and timed sentence usage drills.',
    level: averageStrength < 40 ? 'Foundation' : averageStrength < 65 ? 'Growth' : 'Advanced',
    heatmap: Array.from(heatmapBucket.entries()).map(([date, counts]) => ({ date, ...counts })),
  };
}
