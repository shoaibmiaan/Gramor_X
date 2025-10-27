import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import type { FeedbackJson, ScoresJson, WritingTaskType } from '@/lib/writing/schemas';
import type { Database } from '@/types/supabase';

interface ReviewProps {
  attempt: {
    id: string;
    status: Database['public']['Enums']['writing_attempt_status'];
    promptSlug: string;
    promptTopic: string;
    taskType: WritingTaskType;
    draftText: string;
    wordCount: number;
    timeSpentMs: number;
    overallBand: number | null;
    scores: ScoresJson | null;
    feedback: FeedbackJson | null;
    metrics: {
      ttr: number | null;
      wpm: number | null;
      cohesionDensity: number | null;
      templateOveruse: number | null;
      originalityScore: number | null;
    } | null;
    submittedAt: string;
    updatedAt: string;
  };
  reviews: {
    id: string;
    role: Database['public']['Enums']['writing_review_role'];
    reviewerId: string;
    scores: Record<string, number> | null;
    comments: { path: string; note: string }[] | null;
    createdAt: string;
  }[];
}

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const ReviewPage = ({ attempt, reviews }: ReviewProps) => {
  const [redraftLoading, setRedraftLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedraft = async () => {
    setRedraftLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/writing/attempts/redraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAttemptId: attempt.id }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string })?.error ?? 'Unable to create redraft');
      }
      const payload = (await response.json()) as { attemptId: string };
      window.location.assign(`/writing/${attempt.promptSlug}?attemptId=${payload.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create redraft');
    } finally {
      setRedraftLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Writing review • {attempt.promptTopic}</title>
      </Head>
      <Container className="py-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex flex-col gap-2">
            <Badge variant="soft" tone="info" size="sm" className="capitalize">
              {attempt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
            </Badge>
            <h1 className="text-3xl font-semibold text-foreground">{attempt.promptTopic}</h1>
            <p className="text-sm text-muted-foreground">Submitted {formatDate(attempt.submittedAt)}</p>
            {error && <p className="text-sm text-danger">{error}</p>}
          </header>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card className="card-surface space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Overall band</span>
                  <span className="text-3xl font-semibold text-foreground">
                    {attempt.overallBand ? attempt.overallBand.toFixed(1) : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{attempt.wordCount} words</span>
                  <span>{Math.round(attempt.timeSpentMs / 60000)} min</span>
                  <Badge variant="soft" tone={attempt.status === 'scored' ? 'success' : 'info'} size="sm">
                    {attempt.status === 'scored' ? 'Scored' : 'Scoring'}
                  </Badge>
                </div>
              </div>

              {attempt.scores ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['TR', 'CC', 'LR', 'GRA'] as const).map((criterion) => {
                    const scoreValue = attempt.scores?.[criterion] ?? null;
                    return (
                      <Card key={criterion} className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-none">
                        <p className="text-sm text-muted-foreground">{criterion}</p>
                        <p className="text-2xl font-semibold text-foreground">
                          {scoreValue != null ? scoreValue.toFixed(1) : '—'}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="Scoring in progress" description="Refresh in a minute to see band details." />
              )}

              {attempt.feedback?.fixes && attempt.feedback.fixes.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">Actionable fixes</h2>
                  <ul className="space-y-3">
                    {attempt.feedback.fixes.map((fix) => (
                      <li key={fix.title} className="rounded-2xl border border-border/60 bg-card p-4">
                        <p className="text-sm font-semibold text-foreground">{fix.title}</p>
                        <p className="text-sm text-muted-foreground">{fix.why}</p>
                        {fix.example && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">Example:</span> {fix.example}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Submitted essay</h2>
                <Card className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{attempt.draftText}</p>
                </Card>
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card className="card-surface space-y-3 p-6">
                <h2 className="text-lg font-semibold text-foreground">Metrics</h2>
                {attempt.metrics ? (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Words per minute: <span className="text-foreground">{attempt.metrics.wpm ?? '—'}</span></li>
                    <li>Type-token ratio: <span className="text-foreground">{attempt.metrics.ttr ?? '—'}</span></li>
                    <li>Cohesion density: <span className="text-foreground">{attempt.metrics.cohesionDensity ?? '—'}</span></li>
                    <li>Template overuse: <span className="text-foreground">{attempt.metrics.templateOveruse ?? '—'}</span></li>
                    <li>Originality score: <span className="text-foreground">{attempt.metrics.originalityScore ?? '—'}</span></li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Metrics will appear once analysis finishes.</p>
                )}
              </Card>

              <Card className="card-surface space-y-3 p-6">
                <h2 className="text-lg font-semibold text-foreground">Next steps</h2>
                <p className="text-sm text-muted-foreground">
                  Lock in improvements by running targeted drills, then start a redraft attempt.
                </p>
                <Button onClick={handleRedraft} loading={redraftLoading} disabled={attempt.status !== 'scored'}>
                  Start redraft
                </Button>
                <Button variant="outline" href="/writing">
                  Back to writing studio
                </Button>
              </Card>

              <Card className="card-surface space-y-4 p-6">
                <h2 className="text-lg font-semibold text-foreground">Peer &amp; teacher reviews</h2>
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No human reviews yet. Invite a peer or coach to review this attempt.</p>
                ) : (
                  <ul className="space-y-3">
                    {reviews.map((review) => (
                      <li key={review.id} className="rounded-2xl border border-border/60 bg-card p-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="capitalize">{review.role}</span>
                          <span>{formatDate(review.createdAt)}</span>
                        </div>
                        {review.scores && (
                          <div className="mt-2 grid gap-2 text-sm text-muted-foreground">
                            {Object.entries(review.scores).map(([criterion, value]) => (
                              <div key={criterion} className="flex justify-between">
                                <span className="capitalize">{criterion}</span>
                                <span className="text-foreground">{value.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {review.comments && review.comments.length > 0 && (
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {review.comments.map((comment) => (
                              <li key={`${review.id}-${comment.path}`}
                                className="rounded-xl bg-muted/20 p-3">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{comment.path}</p>
                                <p>{comment.note}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<ReviewProps> = withPlanPage('free')(async (ctx) => {
  const { attemptId } = ctx.params as { attemptId: string };
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome?from=/writing',
        permanent: false,
      },
    };
  }

  const { data: attemptRow } = await supabase
    .from('writing_attempts')
    .select(
      'id, status, draft_text, word_count, time_spent_ms, overall_band, scores_json, feedback_json, created_at, updated_at, task_type, writing_prompts (slug, topic), writing_metrics (ttr, wpm, cohesion_density, template_overuse, originality_score)'
    )
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!attemptRow) {
    return { notFound: true };
  }

  const attempt: ReviewProps['attempt'] = {
    id: attemptRow.id,
    status: attemptRow.status,
    promptSlug: (attemptRow.writing_prompts as { slug: string } | null)?.slug ?? '',
    promptTopic: (attemptRow.writing_prompts as { topic: string } | null)?.topic ?? 'Writing prompt',
    taskType: attemptRow.task_type as WritingTaskType,
    draftText: attemptRow.draft_text ?? '',
    wordCount: attemptRow.word_count ?? 0,
    timeSpentMs: attemptRow.time_spent_ms ?? 0,
    overallBand: attemptRow.overall_band,
    scores: (attemptRow.scores_json ?? null) as ScoresJson | null,
    feedback: (attemptRow.feedback_json ?? null) as FeedbackJson | null,
    metrics: attemptRow.writing_metrics
      ? {
          ttr: (attemptRow.writing_metrics as { ttr: number | null }).ttr ?? null,
          wpm: (attemptRow.writing_metrics as { wpm: number | null }).wpm ?? null,
          cohesionDensity: (attemptRow.writing_metrics as { cohesion_density: number | null }).cohesion_density ?? null,
          templateOveruse: (attemptRow.writing_metrics as { template_overuse: number | null }).template_overuse ?? null,
          originalityScore: (attemptRow.writing_metrics as { originality_score: number | null }).originality_score ?? null,
        }
      : null,
    submittedAt: attemptRow.created_at,
    updatedAt: attemptRow.updated_at,
  };

  const { data: reviewRows } = await supabase
    .from('writing_reviews')
    .select('id, role, reviewer_id, scores_json, comments_json, created_at')
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: false });

  const reviews = (reviewRows ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    reviewerId: row.reviewer_id,
    scores: (row.scores_json as Record<string, number> | null) ?? null,
    comments: Array.isArray(row.comments_json)
      ? (row.comments_json as { path: string; note: string }[])
      : null,
    createdAt: row.created_at,
  }));

  return {
    props: {
      attempt,
      reviews,
    },
  };
});

export default ReviewPage;
