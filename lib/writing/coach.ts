// lib/writing/coach.ts
// Utilities to fetch writing attempt context for the AI coach experience.

import type { SupabaseClient } from '@supabase/supabase-js';

import { computeWritingSummary } from '@/lib/analytics/writing';
import type { Database } from '@/types/supabase';
import type {
  WritingFeedback,
  WritingScorePayload,
  WritingTaskType,
} from '@/types/writing';

export type CoachTaskSummary = {
  id: string;
  task: WritingTaskType;
  essay: string;
  score: WritingScorePayload;
};

export type CoachHighlight = {
  task: WritingTaskType;
  essay: string;
  feedback: WritingFeedback;
};

export type CoachSessionSnapshot = {
  attemptId: string;
  createdAt: string;
  submittedAt: string;
  averageBand: number;
  tasks: CoachTaskSummary[];
  highlight: CoachHighlight | null;
};

const DEFAULT_FEEDBACK: WritingFeedback = {
  summary: 'Feedback will be available shortly.',
  strengths: [],
  improvements: [],
  perCriterion: {
    task_response: { band: 0, feedback: '' },
    coherence_and_cohesion: { band: 0, feedback: '' },
    lexical_resource: { band: 0, feedback: '' },
    grammatical_range: { band: 0, feedback: '' },
  },
};

const mapRowToScore = (row: any): WritingScorePayload => {
  const bandScores = (row.band_scores as Record<string, number> | null) ?? {};
  const feedback = (row.feedback as WritingFeedback | null) ?? DEFAULT_FEEDBACK;

  return {
    version: (row.evaluation_version as string) ?? 'baseline-v1',
    overallBand: Number(row.overall_band ?? 0),
    bandScores: {
      task_response: Number(bandScores.task_response ?? 0),
      coherence_and_cohesion: Number(bandScores.coherence_and_cohesion ?? 0),
      lexical_resource: Number(bandScores.lexical_resource ?? 0),
      grammatical_range: Number(bandScores.grammatical_range ?? 0),
      overall: typeof bandScores.overall === 'number' ? bandScores.overall : undefined,
    },
    feedback,
    wordCount: Number(row.word_count ?? 0),
    durationSeconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
    tokensUsed: typeof row.tokens_used === 'number' ? row.tokens_used : undefined,
  } satisfies WritingScorePayload;
};

const mergeFeedbackExtras = (
  feedback: WritingFeedback,
  extras: { band9_rewrite?: unknown; errors?: unknown; blocks?: unknown } | undefined,
): WritingFeedback => {
  if (!extras) return feedback;
  return {
    ...feedback,
    band9Rewrite: (extras.band9_rewrite as WritingFeedback['band9Rewrite']) ?? feedback.band9Rewrite,
    errors: (extras.errors as WritingFeedback['errors']) ?? feedback.errors,
    blocks: (extras.blocks as WritingFeedback['blocks']) ?? feedback.blocks,
  };
};

export async function loadCoachSession(
  supabase: SupabaseClient<Database>,
  userId: string,
  attemptId: string,
): Promise<CoachSessionSnapshot | null> {
  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('id, user_id, created_at, submitted_at, updated_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.user_id !== userId) {
    return null;
  }

  const { data: responses, error: responsesError } = await supabase
    .from('writing_responses')
    .select(
      'id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, submitted_at, created_at',
    )
    .eq('exam_attempt_id', attemptId);

  if (responsesError) {
    return null;
  }

  const relevant = (responses ?? []).filter(
    (row): row is typeof row & { task: WritingTaskType } => row.task === 'task1' || row.task === 'task2',
  );

  if (relevant.length === 0) {
    return {
      attemptId,
      createdAt: attempt.created_at,
      submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at,
      averageBand: 0,
      tasks: [],
      highlight: null,
    };
  }

  const responseIds = relevant.map((row) => row.id).filter((id): id is string => typeof id === 'string');
  const { data: feedbackRows } = responseIds.length
    ? await supabase
        .from('writing_feedback')
        .select('attempt_id, band9_rewrite, errors, blocks')
        .in('attempt_id', responseIds)
    : { data: [] as any[] };

  const tasks: CoachTaskSummary[] = relevant.map((row) => {
    const score = mapRowToScore(row);
    const extras = feedbackRows?.find((item) => item.attempt_id === row.id);
    const enriched = mergeFeedbackExtras(score.feedback, extras);
    return {
      id: row.id as string,
      task: row.task,
      essay: (row.answer_text as string) ?? '',
      score: {
        ...score,
        feedback: enriched,
      },
    } satisfies CoachTaskSummary;
  });

  const summaryInput = tasks.map((task) => ({
    id: task.id,
    attemptId,
    examAttemptId: attemptId,
    promptId: undefined,
    task: task.task,
    answerText: task.essay,
    wordCount: task.score.wordCount,
    overallBand: task.score.overallBand,
    bandScores: task.score.bandScores,
    feedback: task.score.feedback,
    durationSeconds: task.score.durationSeconds,
    evaluationVersion: task.score.version,
    tokensUsed: task.score.tokensUsed,
    createdAt: attempt.created_at,
    submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at,
    metadata: null,
  }));

  const summary = computeWritingSummary(summaryInput);

  const highlightCandidate = tasks.find((task) => task.task === 'task2') ?? tasks[0];
  const highlight: CoachHighlight | null = highlightCandidate
    ? {
        task: highlightCandidate.task,
        essay: highlightCandidate.essay,
        feedback: highlightCandidate.score.feedback,
      }
    : null;

  return {
    attemptId,
    createdAt: attempt.created_at,
    submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at,
    averageBand: summary.averageBand || 0,
    tasks,
    highlight,
  } satisfies CoachSessionSnapshot;
}

