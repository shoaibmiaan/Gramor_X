import { useMemo } from 'react';
import type { GetServerSideProps } from 'next';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { WritingLayout } from '@/layouts/WritingLayout';
import {   withPlan } from '@/lib/plan/withPlan';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { PlanId } from '@/types/pricing';
import type { AttemptSummary } from '@/types/writing-dashboard';
import { mapAttemptRow } from '@/lib/writing/mappers';

const statusLabel: Record<AttemptSummary['status'], string> = {
  draft: 'Draft in progress',
  submitted: 'Scoring pending',
  scored: 'Scored',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

interface ProgressPageProps {
  drafts: AttemptSummary[];
  recent: AttemptSummary[];
  __plan: PlanId;
}

const WritingProgress = ({ drafts, recent, __plan }: ProgressPageProps) => {
  const totalWords = useMemo(() => recent.reduce((sum, attempt) => sum + attempt.wordCount, 0), [recent]);
  const scoredAttempts = useMemo(() => recent.filter((attempt) => attempt.status === 'scored'), [recent]);
  const averageBand = useMemo(() => {
    const scoredBands = scoredAttempts.map((attempt) => attempt.overallBand ?? 0).filter((band) => band > 0);
    if (scoredBands.length === 0) return null;
    const avg = scoredBands.reduce((sum, band) => sum + band, 0) / scoredBands.length;
    return avg;
  }, [scoredAttempts]);

  return (
    <WritingLayout plan={__plan} current="progress">
      <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-foreground">Attempt insights</h2>
            <p className="text-sm text-muted-foreground">
              Track drafts in progress, revisit recent submissions, and spot opportunities for the next rewrite.
            </p>
          </div>
          <Badge variant="soft" tone="default" size="sm">
            {recent.length} recent · {drafts.length} active drafts
          </Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Words logged</p>
            <p className="text-2xl font-semibold text-foreground">{totalWords.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Across the last {recent.length} attempts</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Scored attempts</p>
            <p className="text-2xl font-semibold text-foreground">{scoredAttempts.length}</p>
            <p className="text-xs text-muted-foreground">{scoredAttempts.length > 0 ? 'Ready for deeper review' : 'Submit drafts for scoring'}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Average band</p>
            <p className="text-2xl font-semibold text-foreground">
              {averageBand ? averageBand.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {averageBand ? 'Based on scored attempts in the last 90 days' : 'Complete scored attempts to unlock band trends'}
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Continue drafts</h3>
              <p className="text-sm text-muted-foreground">Pick up where you left off with autosaved work.</p>
            </div>
            <Badge variant="soft" tone="default" size="sm">
              {drafts.length} active
            </Badge>
          </div>
          {drafts.length === 0 ? (
            <EmptyState
              title="No active drafts"
              description="Start a new attempt or revisit a scored attempt to launch a redraft."
            />
          ) : (
            <ul className="space-y-4">
              {drafts.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{attempt.promptTopic}</p>
                      <p className="text-xs text-muted-foreground">Updated {formatDateTime(attempt.updatedAt)}</p>
                    </div>
                    <Badge variant="soft" tone="info" size="sm" className="capitalize">
                      {attempt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{attempt.wordCount} words saved</span>
                    <span>{statusLabel[attempt.status]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
                      Resume draft
                    </Button>
                    <Button size="sm" variant="ghost" href={`/writing/${attempt.promptSlug}`}>
                      View prompt
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Recent attempts</h3>
              <p className="text-sm text-muted-foreground">See what you submitted recently and track your scores.</p>
            </div>
            <Badge variant="soft" tone="default" size="sm">
              Last {recent.length}
            </Badge>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="No attempts yet"
              description="Submit an essay to unlock AI feedback and trend tracking."
            />
          ) : (
            <ul className="space-y-4">
              {recent.map((attempt) => (
                <li
                  key={attempt.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{attempt.promptTopic}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(attempt.updatedAt)}</p>
                    </div>
                    <Badge variant="soft" tone={attempt.status === 'scored' ? 'success' : 'info'} size="sm">
                      {statusLabel[attempt.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{attempt.wordCount} words</span>
                    {attempt.overallBand ? (
                      <span className="font-semibold text-foreground">Band {attempt.overallBand.toFixed(1)}</span>
                    ) : (
                      <span>Awaiting score</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
                      View details
                    </Button>
                    {attempt.hasFeedback && (
                      <Button size="sm" variant="ghost" href={`/writing/review/${attempt.id}`}>
                        Review feedback
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card className="card-surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Upgrade your analysis</h3>
            <p className="text-sm text-muted-foreground">
              Export writing history, compare drafts side-by-side, and unlock AI prompt generation with Owl.
            </p>
          </div>
          <Badge variant="soft" tone="info" size="sm">
            Keep improving
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Button href="/writing/library" variant="outline">
            Explore prompt library
          </Button>
          <Button href="/writing/reviews" variant="ghost">
            Analyse AI feedback
          </Button>
          <Button href="/pricing?need=master" variant="primary">
            See Owl benefits
          </Button>
        </div>
      </Card>
    </WritingLayout>
  );
};

export const getServerSideProps: GetServerSideProps<ProgressPageProps> = withPlan('starter')(async (ctx) => {
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

  const { data: attemptRows } = await supabase
    .from('writing_attempts')
    .select('id, prompt_id, status, updated_at, word_count, overall_band, task_type, feedback_json, writing_prompts (slug, topic)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30);

  const attempts = (attemptRows ?? []).map((row) =>
    mapAttemptRow({
      ...row,
      prompt: row.writing_prompts as Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null,
    }),
  );

  const drafts = attempts.filter((attempt) => attempt.status !== 'scored');
  const recent = attempts.slice(0, 20);

  return {
    props: {
      drafts,
      recent,
    },
  } as any;
});

export default WritingProgress;
