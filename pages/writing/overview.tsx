import React, { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Separator } from '@/components/design-system/Separator';
import { WritingLayout } from '@/layouts/WritingLayout';
import { withPlan } from '@/lib/plan/withPlan';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { PlanId } from '@/types/pricing';
import type { AttemptSummary, ReadinessSummary } from '@/types/writing-dashboard';
import { mapAttemptRow } from '@/lib/writing/mappers';
import {
  buildRetakeReminder,
  ensureNotificationChannels,
  getDailyMicroPrompt,
  shouldSendMicroPromptToday,
} from '@/lib/writing/notifications';

/*
  This file centralises lightweight UI primitives that wrap your existing DS components.
  It's intentionally placed so you can later split each primitive into its own file under
  `@/components/ui` and re-export from the design-system barrel.

  If you prefer, move `ActionButton`, `OverviewCard`, `StatItem`, and `AttemptCard` to:
  - components/ui/ActionButton.tsx
  - components/ui/OverviewCard.tsx
  - components/ui/StatItem.tsx
  - components/ui/AttemptCard.tsx

  Then export them from `@/components/ui/index.ts` and update imports in this page to:
  `import { ActionButton, OverviewCard, StatItem, AttemptCard } from '@/components/ui';`
*/

/* --------------------------- Design-system wrappers (thin) --------------------------- */

// ActionButton wraps the DS Button and centralises how we render links vs buttons.
export type ActionButtonProps = React.ComponentProps<typeof Button> & { to?: string };
export const ActionButton = ({ to, children, ...rest }: ActionButtonProps) =>
  to ? (
    <Button {...(rest as any)} href={to}>
      {children}
    </Button>
  ) : (
    <Button {...(rest as any)}>{children}</Button>
  );

// OverviewCard provides a single place to change card surface for overview pages.
export const OverviewCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <Card className={`card-surface p-6 sm:p-8 ${className}`}>{children}</Card>
);

export const StatItem: React.FC<{
  label: string;
  value: string | number;
  meta?: string | React.ReactNode;
  progress?: number; // 0..100
}> = ({ label, value, meta, progress }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </div>
      {typeof progress === 'number' && <ProgressBar value={progress} tone="info" ariaLabel={`${label} progress`} />}
      {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
};

export const AttemptCard: React.FC<{ attempt: AttemptSummary; compact?: boolean }> = ({ attempt, compact = false }) => {
  return (
    <li className={`flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-transform ${compact ? 'sm:flex-row sm:items-center' : ''}`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{attempt.promptTopic}</p>
        <p className="text-xs text-muted-foreground">Updated {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.updatedAt))}</p>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground sm:mt-0 sm:flex-col sm:items-end">
        <span>{attempt.wordCount} words</span>
        {attempt.overallBand ? <span className="font-semibold text-foreground">Band {attempt.overallBand.toFixed(1)}</span> : <span>Awaiting score</span>}
      </div>

      <div className="mt-3 flex gap-2 sm:mt-0">
        <ActionButton size="sm" variant="outline" to={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
          View
        </ActionButton>
        {attempt.hasFeedback && (
          <ActionButton size="sm" variant="ghost" to={`/writing/review/${attempt.id}`}>
            Review
          </ActionButton>
        )}
      </div>
    </li>
  );
};

/* --------------------------- Page implementation (uses the wrappers above) --------------------------- */

const RETAKE_PLAN_TARGETS = { redrafts: 6, drills: 8, mocks: 2 } as const;

const progressPercentage = (value: number, target: number) => {
  if (target <= 0) return value > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
};

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const statusLabel: Record<AttemptSummary['status'], string> = {
  draft: 'Draft in progress',
  submitted: 'Scoring pending',
  scored: 'Scored',
};

const planLimitCopy: Record<PlanId, { label: string; description: string }> = {
  free: {
    label: 'Explorer preview',
    description: 'Upgrade to Seedling to unlock the full library with filters and drill recommendations.',
  },
  starter: {
    label: '100 prompts unlocked',
    description: 'Browse the 100 most recent prompts curated for Seedling plans with smart filters.',
  },
  booster: {
    label: '500 detailed prompts',
    description: 'Rocket members unlock 500 prompts with deeper outlines and historical metadata.',
  },
  master: {
    label: '500 prompts + AI',
    description: 'Owl unlocks the full 500 prompt vault plus on-demand AI prompt generation.',
  },
};

interface OverviewPageProps {
  readiness: ReadinessSummary | null;
  planSummary: {
    windowStart: string;
    windowEnd: string | null;
    redraftsCompleted: number;
    drillsCompleted: number;
    mocksCompleted: number;
  };
  microPrompt: {
    message: string;
    lastSentAt: string | null;
    channels: string[];
    canSendWhatsApp: boolean;
    alreadySentToday: boolean;
    retakeReminder: {
      message: string;
      completion: number;
      missing: string[];
    } | null;
  };
  stats: {
    activeDrafts: number;
    recentAttempts: AttemptSummary[];
  };
  __plan: PlanId;
}

const WritingOverview = ({ readiness, planSummary, microPrompt, stats, __plan }: OverviewPageProps) => {
  const [microPromptState, setMicroPromptState] = useState(microPrompt);
  const [microPromptLoading, setMicroPromptLoading] = useState(false);
  const [microPromptError, setMicroPromptError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const passReadiness = readiness?.pass ?? false;
  const missingSummary = readiness?.missing ?? [];

  const planTargets = RETAKE_PLAN_TARGETS;

  const planProgressItems = useMemo(
    () => [
      { key: 'redrafts', label: 'Redrafts completed', value: planSummary.redraftsCompleted, target: planTargets.redrafts },
      { key: 'drills', label: 'Micro-drills logged', value: planSummary.drillsCompleted, target: planTargets.drills },
      { key: 'mocks', label: 'Mock attempts reviewed', value: planSummary.mocksCompleted, target: planTargets.mocks },
    ] as const,
    [planSummary.drillsCompleted, planSummary.mocksCompleted, planSummary.redraftsCompleted, planTargets.drills, planTargets.mocks, planTargets.redrafts],
  );

  const refreshMicroPrompt = useCallback(async () => {
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt');
      const payload = (await response.json()) as
        | ({ ok: true; message: string; lastSentAt: string | null; channels: string[]; canSendWhatsApp: boolean; alreadySentToday: boolean; retakeReminder: OverviewPageProps['microPrompt']['retakeReminder'] })
        | ({ ok: false; error: string });

      if (!response.ok || !payload || !('ok' in payload) || !payload.ok) {
        const reason = !payload || !('error' in payload) ? 'Unable to refresh micro prompt' : payload.error;
        throw new Error(reason);
      }

      setMicroPromptState({
        message: payload.message,
        lastSentAt: payload.lastSentAt,
        channels: payload.channels,
        canSendWhatsApp: payload.canSendWhatsApp,
        alreadySentToday: payload.alreadySentToday,
        retakeReminder: payload.retakeReminder,
      });
      setMicroPromptError(null);
      setAnnouncement('Daily micro prompt refreshed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh micro prompt';
      setMicroPromptError(message);
      setAnnouncement(message);
    }
  }, []);

  const handleSendMicroPrompt = useCallback(async () => {
    setMicroPromptLoading(true);
    setMicroPromptError(null);
    setAnnouncement('Sending micro prompt…');
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: ['in_app', 'whatsapp'], source: 'dashboard' }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? 'Unable to send micro prompt');
      }
      await refreshMicroPrompt();
    } catch (err) {
      setMicroPromptError(err instanceof Error ? err.message : 'Unable to send micro prompt');
      setAnnouncement('Unable to send micro prompt');
    } finally {
      setMicroPromptLoading(false);
    }
  }, [refreshMicroPrompt]);

  const currentPlanCopy = planLimitCopy[__plan];

  return (
    <WritingLayout plan={__plan} current="overview">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {/* Primary overview hero */}
      <OverviewCard className="relative overflow-hidden border border-border/50 bg-gradient-to-br from-primary/10 via-background/80 to-background/95 shadow-xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <Badge variant="default" tone={passReadiness ? 'success' : 'info'} size="sm">
              {passReadiness ? 'Redraft unlocked' : 'Stay consistent'}
            </Badge>

            <div className="space-y-3">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Your writing overview</h2>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                Track readiness, review reminders, and hop into focused drills. Use the navigation above to explore the full prompt library and analyze your history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ActionButton variant="primary" size="lg" to="/writing/library">
                Browse prompt library
              </ActionButton>
              <ActionButton variant="outline" size="lg" to="/writing/progress">
                View drafts &amp; feedback
              </ActionButton>
              <ActionButton variant="ghost" size="lg" to="/writing/drills">
                Jump into drills
              </ActionButton>
            </div>

            {!passReadiness && missingSummary.length > 0 && (
              <p className="text-sm text-muted-foreground">Unlock redrafts by completing: {missingSummary.join(', ')}</p>
            )}
          </div>

          <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-5 text-sm text-muted-foreground shadow-inner lg:max-w-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Study window</span>
              <Badge variant="default" tone="info" size="sm">
                {formatDate(planSummary.windowStart)} &ndash; {planSummary.windowEnd ? formatDate(planSummary.windowEnd) : 'TBD'}
              </Badge>
            </div>

            <Separator />

            <ul className="space-y-3">
              {planProgressItems.map((item) => (
                <li key={item.key} className="space-y-2">
                  <StatItem label={item.label} value={`${item.value}/${item.target}`} progress={progressPercentage(item.value, item.target)} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </OverviewCard>

      {/* Prompt access + Micro prompt */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] mt-6">
        <OverviewCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold text-foreground">Prompt access</h3>
              <p className="text-sm text-muted-foreground">{currentPlanCopy.description}</p>
            </div>
            <Badge variant="default" tone="default" size="sm">
              {currentPlanCopy.label}
            </Badge>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>{currentPlanCopy.description}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <ActionButton variant="primary" to="/writing/library">Open prompt library</ActionButton>
            <ActionButton variant="ghost" to="/pricing?need=starter">Upgrade plans</ActionButton>
          </div>
        </OverviewCard>

        <OverviewCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Daily micro prompt</h3>
              <p className="text-sm text-muted-foreground">A quick nudge to sharpen today&apos;s session.</p>
            </div>
            <Badge variant="default" tone="info" size="sm">Updated daily</Badge>
          </div>

          <div className="mt-3 rounded-2xl border border-dashed border-border/50 bg-muted/50 p-3 text-sm text-foreground">{microPromptState.message}</div>

          {microPromptState.retakeReminder && (
            <div className="mt-3 rounded-2xl border border-dashed border-border/40 bg-card/60 p-3 text-xs text-muted-foreground">{microPromptState.retakeReminder.message}</div>
          )}

          {microPromptError && <p className="mt-2 text-sm text-danger">{microPromptError}</p>}

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{microPromptState.lastSentAt ? `Last nudged ${formatDateTime(microPromptState.lastSentAt)}` : 'Not delivered yet today'}</span>
            {!microPromptState.canSendWhatsApp && (
              <span>
                WhatsApp nudges require opt-in &mdash; manage in{' '}
                <Link href="/notifications" className="text-primary underline underline-offset-4">
                  notification settings
                </Link>
                .
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton size="sm" variant="primary" onClick={handleSendMicroPrompt} disabled={microPromptState.alreadySentToday && !microPromptLoading} loading={microPromptLoading}>
              {microPromptState.alreadySentToday ? 'Sent for today' : 'Send reminder now'}
            </ActionButton>
            <ActionButton size="sm" variant="ghost" onClick={refreshMicroPrompt}>Refresh tip</ActionButton>
          </div>

          {microPromptState.alreadySentToday && <p className="mt-2 text-xs text-muted-foreground">Tip already delivered today &mdash; check back tomorrow for a fresh cue.</p>}
        </OverviewCard>
      </section>

      {/* Drafts & Submissions */}
      <section className="grid gap-6 lg:grid-cols-2 mt-6">
        <OverviewCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Active drafts</h3>
              <p className="text-sm text-muted-foreground">Pick up where you left off with autosaved work.</p>
            </div>
            <Badge variant="default" tone="default" size="sm">{stats.activeDrafts} active</Badge>
          </div>

          <div className="mt-4">
            {stats.recentAttempts.filter((a) => a.status !== 'scored').length === 0 ? (
              <EmptyState title="No active drafts" description="Start a new attempt or revisit a scored attempt to launch a redraft." />
            ) : (
              <ul className="space-y-4">
                {stats.recentAttempts.filter((a) => a.status !== 'scored').slice(0, 3).map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <ActionButton variant="ghost" to="/writing/progress">View full progress</ActionButton>
          </div>
        </OverviewCard>

        <OverviewCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Recent submissions</h3>
              <p className="text-sm text-muted-foreground">See what you submitted recently and track your scores.</p>
            </div>
            <Badge variant="default" tone="default" size="sm">Last {Math.min(stats.recentAttempts.length, 6)}</Badge>
          </div>

          <div className="mt-4">
            {stats.recentAttempts.length === 0 ? (
              <EmptyState title="No attempts yet" description="Submit an essay to unlock AI feedback and trend tracking." />
            ) : (
              <ul className="space-y-4">{stats.recentAttempts.slice(0, 6).map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />)}</ul>
            )}
          </div>

          <div className="mt-4">
            <ActionButton variant="ghost" to="/writing/progress">View all attempts</ActionButton>
          </div>
        </OverviewCard>
      </section>

      {/* Resources / Boost */}
      <OverviewCard className="mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Boost your next attempt</h3>
            <p className="text-sm text-muted-foreground">Layer drills, reviews, and mock feedback to sharpen your routine.</p>
          </div>
          <Badge variant="default" tone="info" size="sm">Curated resources</Badge>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Link href="/writing/drills" className="group block rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card">
            <div className="flex flex-col h-full">
              <span className="text-sm font-semibold text-foreground">Skill drills</span>
              <span className="mt-2 text-sm text-muted-foreground">Target coherence, task achievement, and grammar with 10-minute micro drills.</span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Visit drills</span>
            </div>
          </Link>

          <Link href="/writing/reviews" className="group block rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card">
            <div className="flex flex-col h-full">
              <span className="text-sm font-semibold text-foreground">AI reviews</span>
              <span className="mt-2 text-sm text-muted-foreground">Compare attempts, highlight improvements, and plan your next rewrite.</span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Open reviews</span>
            </div>
          </Link>

          <Link href="/writing/drills?tab=mocks" className="group block rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card">
            <div className="flex flex-col h-full">
              <span className="text-sm font-semibold text-foreground">Mock library</span>
              <span className="mt-2 text-sm text-muted-foreground">Revisit scored mocks, analyse feedback themes, and schedule your next redraft.</span>
              <span className="mt-auto text-sm font-medium text-primary group-hover:underline">Browse mocks</span>
            </div>
          </Link>
        </div>
      </OverviewCard>
    </WritingLayout>
  );
};

export const getServerSideProps: GetServerSideProps<OverviewPageProps> = withPlan('starter')(async (ctx) => {
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

  const [{ data: attemptRows }, { data: readinessRow }] = await Promise.all([
    supabase
      .from('writing_attempts')
      .select('id, prompt_id, status, updated_at, word_count, overall_band, task_type, feedback_json, writing_prompts (slug, topic)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('writing_readiness')
      .select('status, gates_json, window_start, window_end')
      .eq('user_id', user.id)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const attempts = (attemptRows ?? []).map((row) =>
    mapAttemptRow({
      ...row,
      prompt: row.writing_prompts as Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null,
    }),
  );

  const draftsActive = attempts.filter((attempt) => attempt.status !== 'scored').length;

  const gates = (readinessRow?.gates_json ?? null) as { missing?: unknown } | null;
  const readiness: ReadinessSummary | null = readinessRow
    ? {
        pass: readinessRow.status === 'pass',
        missing:
          readinessRow.status === 'pass'
            ? []
            : Array.isArray(gates?.missing)
            ? ((gates?.missing as string[]) ?? [])
            : [],
      }
    : null;

  const planWindowStart = readinessRow?.window_start ?? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const planWindowEnd = readinessRow?.window_end ?? null;

  const [{ count: planDrillsCount }, { count: redraftCount }, { count: mockCount }] = await Promise.all([
    supabase
      .from('writing_drill_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('completed_at', planWindowStart),
    supabase
      .from('writing_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('version_of', 'is', null)
      .gte('created_at', planWindowStart),
    supabase
      .from('writing_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('version_of', null)
      .eq('status', 'scored')
      .gte('created_at', planWindowStart),
  ]);

  const [{ data: profileRow }, { data: lastMicroPrompt }] = await Promise.all([
    supabase
      .from('profiles')
      .select('notification_channels, whatsapp_opt_in')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('writing_notification_events')
      .select('created_at, channel')
      .eq('user_id', user.id)
      .eq('type', 'micro_prompt')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const microPromptSeed = getDailyMicroPrompt();
  const microChannels = ensureNotificationChannels(profileRow?.notification_channels ?? []);
  const microAlreadySent = !shouldSendMicroPromptToday(lastMicroPrompt?.created_at ?? null);
  const retakeReminder = buildRetakeReminder(
    {
      windowStart: planWindowStart,
      windowEnd: planWindowEnd,
      redraftsCompleted: redraftCount ?? 0,
      drillsCompleted: planDrillsCount ?? 0,
      mocksCompleted: mockCount ?? 0,
    },
    RETAKE_PLAN_TARGETS,
  );

  return {
    props: {
      readiness,
      planSummary: {
        windowStart: planWindowStart,
        windowEnd: planWindowEnd,
        redraftsCompleted: redraftCount ?? 0,
        drillsCompleted: planDrillsCount ?? 0,
        mocksCompleted: mockCount ?? 0,
      },
      microPrompt: {
        message: microPromptSeed.message,
        lastSentAt: lastMicroPrompt?.created_at ?? null,
        channels: microChannels,
        canSendWhatsApp: microChannels.includes('whatsapp') && Boolean(profileRow?.whatsapp_opt_in),
        alreadySentToday: microAlreadySent,
        retakeReminder,
      },
      stats: {
        activeDrafts: draftsActive,
        recentAttempts: attempts,
      },
      __plan: ctx.__plan ?? 'starter',
    },
  } as any;
});

export default WritingOverview;