import React, { useEffect } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import BandDiffView from '@/components/writing/BandDiffView';
import BandProgressChart from '@/components/writing/BandProgressChart';
import WritingResultCard from '@/components/writing/WritingResultCard';
import { computeWritingSummary } from '@/lib/analytics/writing';
import { track } from '@/lib/analytics/track';
import { getServerClient } from '@/lib/supabaseServer';
import { computeCriterionDeltas, trimProgressPoints } from '@/lib/writing/progress';
import type { CriterionDelta, WritingProgressPoint } from '@/types/analytics';
import type { WritingFeedback, WritingScorePayload, WritingTaskType } from '@/types/writing';

interface HighlightSection {
  task: WritingTaskType;
  essay: string;
  feedback: WritingFeedback;
}

interface PageProps {
  attemptId: string;
  results: Array<{ task: WritingTaskType; essay: string; score: WritingScorePayload }>;
  averageBand: number;
  highlight?: HighlightSection | null;
  progressPoints: WritingProgressPoint[];
  progressDeltas: CriterionDelta[];
}

const CoachDock = dynamic(() => import('@/components/writing/CoachDock'), {
  ssr: false,
  loading: () => (
    <div className="rounded-ds-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
      Loading coach…
    </div>
  ),
});

const WritingResultsPage: React.FC<PageProps> = ({
  attemptId,
  results,
  averageBand,
  highlight,
  progressPoints,
  progressDeltas,
}) => {
  useEffect(() => {
    track('writing.coach.entry', {
      attemptId,
      tasks: results.length,
      averageBand,
    });
  }, [attemptId, results.length, averageBand]);

  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">Mock writing results</h1>
          <p className="text-sm text-muted-foreground">Attempt ID: {attemptId}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1 font-medium text-foreground">
              Average band {averageBand.toFixed(1)}
            </span>
            <Link href={`/mock/writing/review/${attemptId}`}>
              <Button size="sm" variant="secondary">
                Detailed review
              </Button>
            </Link>
          </div>
        </header>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Scores are still processing. Refresh this page in a few seconds.</p>
        ) : (
          results.map((result) => (
            <WritingResultCard key={result.task} task={result.task} result={result.score} essay={result.essay} />
          ))
        )}

        {highlight ? (
          <BandDiffView essay={highlight.essay} feedback={highlight.feedback} />
        ) : (
          <div className="rounded-ds-xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
            Detailed highlights will appear once AI feedback is ready.
          </div>
        )}

        <BandProgressChart points={progressPoints} deltas={progressDeltas} />

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Need a next step?</h2>
          <p className="text-sm text-muted-foreground">
            Chat with the AI writing coach to plan rewrites, upgrade paragraphs, or build lexical drills using this attempt.
          </p>
          <CoachDock attemptId={attemptId} />
        </section>
      </div>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: {
        destination: '/welcome',
        permanent: false,
      },
    };
  }

  const { attemptId } = ctx.params as { attemptId: string };

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (error || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const { data: responses } = await supabase
    .from('writing_responses')
    .select('id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, submitted_at, created_at')
    .eq('exam_attempt_id', attemptId);

  const responseIds = (responses ?? []).map((row) => row.id).filter(Boolean);
  const { data: feedbackRows } = responseIds.length
    ? await supabase
        .from('writing_feedback')
        .select('attempt_id, band9_rewrite, errors, blocks')
        .in('attempt_id', responseIds as string[])
    : { data: [] };

  const scores = (responses ?? [])
    .filter((row) => row.task === 'task1' || row.task === 'task2')
    .map((row) => ({
      task: row.task as WritingTaskType,
      essay: row.answer_text ?? '',
      score: {
        version: (row.evaluation_version as string) ?? 'baseline-v1',
        overallBand: row.overall_band ?? 0,
        bandScores: (row.band_scores as any) ?? {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
        feedback:
          (row.feedback as any) ?? {
            summary: 'No feedback recorded yet.',
            strengths: [],
            improvements: [],
            perCriterion: {
              task_response: { band: 0, feedback: '' },
              coherence_and_cohesion: { band: 0, feedback: '' },
              lexical_resource: { band: 0, feedback: '' },
              grammatical_range: { band: 0, feedback: '' },
            },
          },
        wordCount: row.word_count ?? 0,
        durationSeconds: row.duration_seconds ?? undefined,
        tokensUsed: undefined,
      } satisfies WritingScorePayload,
      id: row.id as string,
    }));

  const summary = computeWritingSummary(
    scores.map((entry) => ({
      id: `${attemptId}-${entry.task}`,
      attemptId,
      examAttemptId: attemptId,
      promptId: undefined,
      task: entry.task,
      answerText: entry.essay,
      wordCount: entry.score.wordCount,
      overallBand: entry.score.overallBand,
      bandScores: entry.score.bandScores,
      feedback: entry.score.feedback,
      durationSeconds: entry.score.durationSeconds,
      evaluationVersion: entry.score.version,
      tokensUsed: entry.score.tokensUsed,
      createdAt: attempt.created_at,
      submittedAt: attempt.submitted_at ?? attempt.updated_at ?? attempt.created_at,
      metadata: null,
    })),
  );

  const progress = await loadProgress(supabase, user.id, attemptId);

  return {
    props: {
      attemptId,
      results: scores.map(({ id: _id, ...rest }) => rest),
      averageBand: summary.averageBand || 0,
      highlight:
        scores.length > 0
          ? (() => {
              const primary = scores.find((entry) => entry.task === 'task2') ?? scores[0];
              const feedbackRow = feedbackRows?.find((row) => row.attempt_id === primary.id);
              const combinedFeedback: WritingFeedback = {
                ...primary.score.feedback,
                band9Rewrite: feedbackRow?.band9_rewrite ?? primary.score.feedback.band9Rewrite,
                errors: (feedbackRow?.errors as WritingFeedback['errors']) ?? primary.score.feedback.errors,
                blocks: (feedbackRow?.blocks as WritingFeedback['blocks']) ?? primary.score.feedback.blocks,
              };
              return {
                task: primary.task,
                essay: primary.essay,
                feedback: combinedFeedback,
              } satisfies HighlightSection;
            })()
          : null,
      progressPoints: progress.points,
      progressDeltas: progress.deltas,
    },
  };
};

async function loadProgress(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
  currentAttemptId: string,
) {
  const { data: rows } = await supabase
    .from('writing_responses')
    .select('exam_attempt_id, overall_band, band_scores, submitted_at, created_at')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(10);

  const attempts = new Map<string, { total: number; count: number; createdAt: string } & WritingProgressPoint>();

  for (const row of rows ?? []) {
    const examId = row.exam_attempt_id as string | null;
    if (!examId) continue;
    const point =
      attempts.get(examId) ?? {
        attemptId: examId,
        createdAt: row.submitted_at ?? row.created_at ?? new Date().toISOString(),
        overallBand: 0,
        bandScores: {
          task_response: 0,
          coherence_and_cohesion: 0,
          lexical_resource: 0,
          grammatical_range: 0,
        },
        total: 0,
        count: 0,
      };
    point.total += Number(row.overall_band ?? 0);
    point.count += 1;
    const bands = (row.band_scores as Record<string, number> | null) ?? {};
    point.bandScores.task_response += Number(bands.task_response ?? 0);
    point.bandScores.coherence_and_cohesion += Number(bands.coherence_and_cohesion ?? 0);
    point.bandScores.lexical_resource += Number(bands.lexical_resource ?? 0);
    point.bandScores.grammatical_range += Number(bands.grammatical_range ?? 0);
    attempts.set(examId, point);
  }

  const rawPoints: WritingProgressPoint[] = Array.from(attempts.values()).map((point) => {
    const divisor = point.count === 0 ? 1 : point.count;
    return {
      attemptId: point.attemptId,
      createdAt: point.createdAt,
      overallBand: Number((point.total / divisor).toFixed(1)),
      bandScores: {
        task_response: Number((point.bandScores.task_response / divisor).toFixed(1)),
        coherence_and_cohesion: Number((point.bandScores.coherence_and_cohesion / divisor).toFixed(1)),
        lexical_resource: Number((point.bandScores.lexical_resource / divisor).toFixed(1)),
        grammatical_range: Number((point.bandScores.grammatical_range / divisor).toFixed(1)),
      },
    };
  });

  const trimmed = trimProgressPoints(rawPoints, 3);
  const deltas = computeCriterionDeltas(trimmed);

  if (!trimmed.find((point) => point.attemptId === currentAttemptId)) {
    const current = rawPoints.find((point) => point.attemptId === currentAttemptId);
    if (current) {
      trimmed.push(current);
    }
  }

  return { points: trimProgressPoints(trimmed, 3), deltas };
}

export default WritingResultsPage;
