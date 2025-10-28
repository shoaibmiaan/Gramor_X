import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import {
  CriteriaMeters,
  DiffViewer,
  DrillChecklist,
  type DrillChecklistItem,
  FeedbackPanel,
  RetakeGuard,
  type ReadinessState,
} from '@/components/writing/studio';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import type { FeedbackJson, ScoresJson, WritingTaskType } from '@/lib/writing/schemas';
import type { Database } from '@/types/supabase';
import { recommendDrills } from '@/lib/writing/drills';

interface ReviewProps {
  attempt: {
    id: string;
    status: Database['public']['Enums']['writing_attempt_status'];
    promptSlug: string;
    promptTopic: string;
    taskType: WritingTaskType;
    draftText: string;
    previousDraft: string | null;
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
    readiness: ReadinessState | null;
  };
  reviews: {
    id: string;
    role: Database['public']['Enums']['writing_review_role'];
    reviewerId: string;
    scores: Record<string, number> | null;
    comments: { path: string; note: string }[] | null;
    createdAt: string;
  }[];
  recommendedDrills: {
    slug: string;
    title: string;
    criterion: string;
    takeaway: string;
  }[];
  completedDrills: string[];
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildDrillChecklist = (
  attempt: ReviewProps['attempt'],
  recommended: ReviewProps['recommendedDrills'],
  completed: Set<string>,
): DrillChecklistItem[] => {
  const items: DrillChecklistItem[] = [];
  const seen = new Set<string>();

  const addItem = (id: string, label: string, hint?: string, completed = false, href?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ id, label, hint, completed, href });
  };

  attempt.feedback?.fixes?.forEach((fix) => {
    addItem(`fix-${slugify(fix.title)}`, fix.title, fix.why);
  });

  const metrics = attempt.metrics;
  if (metrics) {
    const wpm = metrics.wpm ?? null;
    const lexicalThreshold = 0.5;
    const cohesionThreshold = 0.4;
    const templateThreshold = 0.2;
    const originalityThreshold = 0.7;
    const wpmFloor = attempt.taskType === 'task1' ? 7 : 6;

    if (wpm !== null && wpm < wpmFloor) {
      addItem('metric-wpm', 'Build timed drafting stamina', `Current words per minute: ${wpm}`);
    }
    if (metrics.ttr !== null && metrics.ttr < lexicalThreshold) {
      addItem('metric-ttr', 'Increase lexical variety', `Type-token ratio: ${metrics.ttr}`);
    }
    if (metrics.cohesionDensity !== null && metrics.cohesionDensity < cohesionThreshold) {
      addItem('metric-cohesion', 'Practise cohesive devices', `Cohesion density: ${metrics.cohesionDensity}`);
    }
    if (metrics.templateOveruse !== null && metrics.templateOveruse > templateThreshold) {
      addItem('metric-template', 'Refresh introductions & templates', `Template reuse score: ${metrics.templateOveruse}`);
    }
    if (metrics.originalityScore !== null && metrics.originalityScore < originalityThreshold) {
      addItem('metric-originality', 'Diversify examples & evidence', `Originality score: ${metrics.originalityScore}`);
    }
  }

  attempt.readiness?.missing?.forEach((item, index) => {
    addItem(`gate-${index}`, item);
  });

  recommended.forEach((drill) => {
    addItem(
      `recommended-${drill.slug}`,
      drill.title,
      drill.takeaway,
      completed.has(drill.slug.toLowerCase()),
      `/writing/drills/${drill.slug}`,
    );
  });

  return items;
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const ReviewPage = ({ attempt, reviews, recommendedDrills, completedDrills }: ReviewProps) => {
  const [redraftLoading, setRedraftLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedSet = useMemo(() => new Set(completedDrills.map((value) => value.toLowerCase())), [completedDrills]);
  const drillItems = useMemo(
    () => buildDrillChecklist(attempt, recommendedDrills, completedSet),
    [attempt, recommendedDrills, completedSet],
  );
  const hasCalibration = completedSet.has('calibration_passed');

  const handleRedraft = async (refreshReadiness?: () => Promise<void>) => {
    setRedraftLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/writing/attempts/redraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAttemptId: attempt.id }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: { missing?: string[] };
        };
        const missing = Array.isArray(payload?.details?.missing)
          ? payload.details?.missing?.join(', ')
          : null;
        const messageBase = payload?.error ?? 'Unable to create redraft';
        const message = missing ? `${messageBase}: ${missing}` : messageBase;
        if (response.status === 403 && refreshReadiness) {
          await refreshReadiness();
        }
        throw new Error(message);
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
          <div className="flex flex-col gap-4">
            <Card className="space-y-4" padding="lg">
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
            </Card>

            <CriteriaMeters scores={attempt.scores} />
            <FeedbackPanel feedback={attempt.feedback} />
            <DiffViewer previous={attempt.previousDraft} current={attempt.draftText} />

            <Card className="space-y-3" padding="lg">
              <h2 className="text-lg font-semibold text-foreground">Submitted essay</h2>
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p className="whitespace-pre-line text-sm text-muted-foreground">{attempt.draftText}</p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="space-y-3" padding="lg">
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

            <Card className="space-y-3" padding="lg">
              <h2 className="text-lg font-semibold text-foreground">Next steps</h2>
              <p className="text-sm text-muted-foreground">
                Lock in improvements by running targeted drills, then start a redraft attempt.
              </p>
              <RetakeGuard initial={attempt.readiness} onRefreshError={(err) => setError(err.message)}>
                {({ canRedraft, loading, refresh }) => (
                  <div className="space-y-3">
                    <Button
                      onClick={() => handleRedraft(refresh)}
                      loading={redraftLoading || loading}
                      disabled={attempt.status !== 'scored' || !canRedraft}
                    >
                      Start redraft
                    </Button>
                    <Button variant="outline" href="/writing">
                      Back to writing studio
                    </Button>
                  </div>
                )}
              </RetakeGuard>
            </Card>

            <DrillChecklist items={drillItems} />

          <Card className="space-y-4" padding="lg">
            <h2 className="text-lg font-semibold text-foreground">Peer &amp; teacher reviews</h2>
            {!hasCalibration && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Calibrate with two anchored essays to unlock peer reviews.</p>
                <Button size="xs" variant="ghost" href="/writing/reviews/calibrate" className="mt-2">
                  Start calibration
                </Button>
              </div>
            )}
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
                            <li key={`${review.id}-${comment.path}`} className="rounded-xl bg-muted/20 p-3">
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
      'id, status, draft_text, word_count, time_spent_ms, overall_band, scores_json, feedback_json, created_at, updated_at, task_type, version_of, writing_prompts (slug, topic), writing_metrics (ttr, wpm, cohesion_density, template_overuse, originality_score)'
    )
    .eq('id', attemptId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!attemptRow) {
    return { notFound: true };
  }

  let previousDraft: string | null = null;
  if (attemptRow.version_of) {
    const { data: previousRow } = await supabase
      .from('writing_attempts')
      .select('draft_text')
      .eq('id', attemptRow.version_of as string)
      .eq('user_id', user.id)
      .maybeSingle();
    previousDraft = previousRow?.draft_text ?? null;
  }

  const { data: readinessRow } = await supabase
    .from('writing_readiness')
    .select('status, gates_json')
    .eq('user_id', user.id)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  const attempt: ReviewProps['attempt'] = {
    id: attemptRow.id,
    status: attemptRow.status,
    promptSlug: (attemptRow.writing_prompts as { slug: string } | null)?.slug ?? '',
    promptTopic: (attemptRow.writing_prompts as { topic: string } | null)?.topic ?? 'Writing prompt',
    taskType: attemptRow.task_type as WritingTaskType,
    draftText: attemptRow.draft_text ?? '',
    previousDraft,
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
    readiness: readinessRow
      ? {
          pass: readinessRow.status === 'pass',
          missing:
            readinessRow.status === 'pass'
              ? []
              : (Array.isArray((readinessRow.gates_json as { missing?: string[] })?.missing)
                  ? ((readinessRow.gates_json as { missing?: string[] }).missing ?? [])
                  : []),
        }
      : null,
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

  const weakCriteria: string[] = [];
  if (attempt.scores) {
    (['TR', 'CC', 'LR', 'GRA'] as const).forEach((criterion) => {
      const value = attempt.scores?.[criterion];
      if (typeof value === 'number' && value < 7) {
        weakCriteria.push(criterion);
      }
    });
  }

  const tagHints = new Set<string>();
  attempt.feedback?.fixes?.forEach((fix) => {
    tagHints.add(fix.title.toLowerCase());
  });
  if (attempt.taskType) {
    tagHints.add(attempt.taskType);
  }

  const recommended = recommendDrills({ weakCriteria, tags: Array.from(tagHints), limit: 4 }).map((drill) => ({
    slug: drill.slug,
    title: drill.title,
    criterion: drill.criterion,
    takeaway: drill.takeaway,
  }));

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: drillEvents } = await supabase
    .from('writing_drill_events')
    .select('tags')
    .eq('user_id', user.id)
    .gte('completed_at', since);

  const completedDrills = new Set<string>();
  (drillEvents ?? []).forEach((event) => {
    (event.tags ?? []).forEach((tag) => {
      completedDrills.add(String(tag).toLowerCase());
    });
  });

  return {
    props: {
      attempt,
      reviews,
      recommendedDrills: recommended,
      completedDrills: Array.from(completedDrills),
    },
  };
});

export default ReviewPage;
