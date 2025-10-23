import React from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import WritingResultCard from '@/components/writing/WritingResultCard';
import { computeWritingSummary } from '@/lib/analytics/writing';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingScorePayload, WritingTaskType } from '@/types/writing';

interface PageProps {
  attemptId: string;
  results: Array<{ task: WritingTaskType; essay: string; score: WritingScorePayload }>;
  averageBand: number;
}

const WritingResultsPage: React.FC<PageProps> = ({ attemptId, results, averageBand }) => {
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
    .select('task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, submitted_at, created_at')
    .eq('exam_attempt_id', attemptId);

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

  return {
    props: {
      attemptId,
      results: scores,
      averageBand: summary.averageBand || 0,
    },
  };
};

export default WritingResultsPage;
