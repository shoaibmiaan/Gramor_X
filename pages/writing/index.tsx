import React, { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import WritingPromptCard from '@/components/writing/WritingPromptCard';
import { computeWritingSummary } from '@/lib/analytics/writing';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingSummary } from '@/types/analytics';
import type { WritingPrompt, WritingResponse } from '@/types/writing';

const mapPrompt = (row: any): WritingPrompt => ({
  id: row.id,
  slug: row.slug ?? row.id,
  title: row.title,
  promptText: row.prompt_text,
  taskType: row.task_type ?? 'task2',
  module: row.module ?? 'academic',
  difficulty: row.difficulty ?? 'medium',
  source: row.source ?? undefined,
  tags: row.tags ?? undefined,
  estimatedMinutes: row.estimated_minutes ?? undefined,
  wordTarget: row.word_target ?? undefined,
  metadata: row.metadata ?? undefined,
});

interface PageProps {
  prompts: WritingPrompt[];
  summary: WritingSummary;
}

const WritingDashboard: React.FC<PageProps> = ({ prompts, summary }) => {
  const router = useRouter();
  const [loadingPromptId, setLoadingPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (promptId: string) => {
    setLoadingPromptId(promptId);
    setError(null);
    try {
      const response = await fetch('/api/mock/writing/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to start exam');
      }
      const json = await response.json();
      await router.push(`/mock/writing/${json.attempt.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Unexpected error');
    } finally {
      setLoadingPromptId(null);
    }
  };

  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Writing practice hub</h1>
          <p className="text-base text-muted-foreground">
            Choose a prompt to launch a timed mock exam. Autosave and AI scoring help you prepare for the real IELTS test.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <WritingPromptCard
              key={prompt.id}
              prompt={prompt}
              actions={
                <Button size="sm" onClick={() => handleStart(prompt.id)} loading={loadingPromptId === prompt.id}>
                  Start mock
                </Button>
              }
            />
          ))}
          {prompts.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground">
              No prompts available yet. Administrators can add prompts from the teacher dashboard.
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Recent performance</h2>
          <Card className="p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Average band</p>
                <p className="text-2xl font-semibold text-foreground">{summary.averageBand.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Attempts</p>
                <p className="text-2xl font-semibold text-foreground">{summary.totalAttempts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total words written</p>
                <p className="text-2xl font-semibold text-foreground">{summary.totalWords}</p>
              </div>
            </div>
            {summary.attempts.length > 0 ? (
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                {summary.attempts.slice(0, 5).map((attempt) => (
                  <li key={attempt.attemptId} className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span>
                      {new Date(attempt.createdAt).toLocaleDateString()} · {attempt.durationSeconds ? `${Math.round(attempt.durationSeconds / 60)} min` : '–'}
                    </span>
                    <span className="font-semibold text-foreground">Band {attempt.overallBand.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Complete a mock exam to see analytics and progress here.</p>
            )}
          </Card>
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

  const { data: promptRows } = await supabase
    .from('writing_prompts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6);

  const prompts = (promptRows ?? []).map(mapPrompt);

  const { data: responseRows } = await supabase
    .from('writing_responses')
    .select(
      'id, exam_attempt_id, prompt_id, task, answer_text, word_count, overall_band, band_scores, feedback, duration_seconds, evaluation_version, tokens_used, submitted_at, created_at',
    )
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(30);

  const attemptIds = Array.from(new Set((responseRows ?? []).map((row) => row.exam_attempt_id).filter(Boolean) as string[]));

  const { data: attemptRows } = await supabase
    .from('exam_attempts')
    .select('id, created_at, submitted_at, duration_seconds, goal_band')
    .in('id', attemptIds.length ? attemptIds : ['00000000-0000-0000-0000-000000000000']);

  const responses: WritingResponse[] = (responseRows ?? []).map((row) => ({
    id: row.id,
    attemptId: row.exam_attempt_id ?? undefined,
    examAttemptId: row.exam_attempt_id ?? undefined,
    promptId: row.prompt_id ?? undefined,
    task: row.task ?? undefined,
    answerText: row.answer_text ?? undefined,
    wordCount: row.word_count ?? undefined,
    overallBand: row.overall_band ?? undefined,
    bandScores: (row.band_scores as any) ?? undefined,
    feedback: (row.feedback as any) ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    evaluationVersion: row.evaluation_version ?? undefined,
    tokensUsed: row.tokens_used ?? undefined,
    createdAt: row.created_at,
    submittedAt: row.submitted_at ?? undefined,
    metadata: null,
  }));

  const bandByAttempt = responses.reduce<Record<string, { total: number; count: number }>>((acc, row) => {
    if (!row.examAttemptId || typeof row.overallBand !== 'number') return acc;
    const bucket = (acc[row.examAttemptId] ??= { total: 0, count: 0 });
    bucket.total += row.overallBand;
    bucket.count += 1;
    return acc;
  }, {});

  const attempts = (attemptRows ?? []).map((row) => ({
    attemptId: row.id,
    createdAt: row.created_at,
    overallBand:
      row.id in bandByAttempt && bandByAttempt[row.id].count > 0
        ? Number((bandByAttempt[row.id].total / bandByAttempt[row.id].count).toFixed(2))
        : 0,
    durationSeconds: row.duration_seconds ?? undefined,
    goalBand: row.goal_band ?? undefined,
  }));

  const summary = computeWritingSummary(responses, attempts);

  return {
    props: {
      prompts,
      summary,
    },
  };
};

export default WritingDashboard;
