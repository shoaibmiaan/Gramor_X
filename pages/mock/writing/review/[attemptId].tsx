import React from 'react';
import type { GetServerSideProps } from 'next';

import { Container } from '@/components/design-system/Container';
import WritingResultCard from '@/components/writing/WritingResultCard';
import AccessibilityHints from '@/components/writing/AccessibilityHints';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingScorePayload, WritingTaskType } from '@/types/writing';

interface PageProps {
  attemptId: string;
  results: Array<{ task: WritingTaskType; essay: string; score: WritingScorePayload }>;
}

const WritingReviewPage: React.FC<PageProps> = ({ attemptId, results }) => {
  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header>
          <h1 className="text-3xl font-semibold text-foreground">Attempt review</h1>
          <p className="text-sm text-muted-foreground">Attempt ID: {attemptId}</p>
        </header>
        <AccessibilityHints />
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI feedback available yet. Submit your responses to generate scores.</p>
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

  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (attemptError || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const { data: responses } = await supabase
    .from('writing_responses')
    .select('task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version')
    .eq('exam_attempt_id', attemptId);

  const results = (responses ?? [])
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

  return {
    props: {
      attemptId,
      results,
    },
  };
};

export default WritingReviewPage;
