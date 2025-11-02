import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

// Import UI components from design system
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { EmptyState } from '@/components/design-system/EmptyState';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Separator } from '@/components/design-system/Separator';
import { 
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  ProgressIndicator,
  ResourceGrid,
  StatusPill
} from '@/components/design-system/Dashboard';

import { WritingLayout } from '@/layouts/WritingLayout';
import { withPlanPage } from '@/lib/withPlanPage';
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

const RETAKE_PLAN_TARGETS = { redrafts: 6, drills: 8, mocks: 2 } as const;

// UI Constants
const CARD_SPACING = 'gap-6';
const SECTION_SPACING = 'gap-8';
const HEADING_LEVELS = {
  h1: 'text-3xl font-semibold sm:text-4xl',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
} as const;

const TEXT_STYLES = {
  body: 'text-base leading-relaxed',
  caption: 'text-sm text-muted-foreground',
  micro: 'text-xs text-muted-foreground',
} as const;

// Helper components
const ProgressItem = ({ 
  label, 
  value, 
  target, 
  showNumbers = true 
}: { 
  label: string;
  value: number;
  target: number;
  showNumbers?: boolean;
}) => {
  const percentage = Math.max(0, Math.min(100, Math.round((value / (target || 1)) * 100)));
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={TEXT_STYLES.micro + " uppercase tracking-[0.16em]"}>{label}</span>
        {showNumbers && (
          <span className={TEXT_STYLES.micro + " font-semibold text-foreground"}>
            {value}/{target}
          </span>
        )}
      </div>
      <ProgressBar value={percentage} tone="info" ariaLabel={`${label} progress`} />
    </div>
  );
};

const AttemptCard = ({ 
  attempt, 
  showActions = true 
}: { 
  attempt: AttemptSummary;
  showActions?: boolean;
}) => {
  const statusLabel: Record<AttemptSummary['status'], string> = {
    draft: 'Draft in progress',
    submitted: 'Scoring pending',
    scored: 'Scored',
  };

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  return (
    <div className="dashboard-card group">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {attempt.promptTopic}
            </p>
            <p className={TEXT_STYLES.micro}>
              Updated {formatDateTime(attempt.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill 
              status={attempt.status} 
              tone={attempt.status === 'scored' ? 'success' : 'info'}
            >
              {statusLabel[attempt.status]}
            </StatusPill>
            <Badge variant="soft" tone="info" size="sm">
              {attempt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={TEXT_STYLES.caption}>{attempt.wordCount} words</span>
          {attempt.overallBand ? (
            <span className="text-sm font-semibold text-foreground">
              Band {attempt.overallBand.toFixed(1)}
            </span>
          ) : (
            <span className={TEXT_STYLES.caption}>Awaiting score</span>
          )}
        </div>

        {showActions && (
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant={attempt.status === 'draft' ? 'primary' : 'outline'}
              href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}
            >
              {attempt.status === 'draft' ? 'Resume draft' : 'View details'}
            </Button>
            {attempt.hasFeedback && attempt.status === 'scored' && (
              <Button size="sm" variant="ghost" href={`/writing/review/${attempt.id}`}>
                Review feedback
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const ResourceLink = ({ 
  href, 
  title, 
  description 
}: { 
  href: string;
  title: string;
  description: string;
}) => (
  <Link
    href={href}
    className="resource-card group"
  >
    <span className="text-sm font-semibold text-foreground">{title}</span>
    <span className={TEXT_STYLES.caption}>{description}</span>
    <span className="resource-link">Learn more</span>
  </Link>
);

// Main component
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
    [planSummary, planTargets]
  );

  const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

  const refreshMicroPrompt = useCallback(async () => {
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt');
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? 'Unable to refresh micro prompt');
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
      const payload = await response.json();
      
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

  const currentPlanCopy = useMemo(() => ({
    free: {
      label: 'Explorer preview',
      description: 'Upgrade to Seedling to unlock the full library with filters and drill recommendations.',
      content: 'Ready for more? Upgrade to Seedling to unlock the smart prompt library, plan tracking, and micro prompts tailored to your study window.',
    },
    starter: {
      label: '100 prompts unlocked',
      description: 'Browse the 100 most recent prompts curated for Seedling plans with smart filters.',
      content: 'You can browse the top 100 curated prompts with task and difficulty filters. New prompts arrive daily — visit the library to explore the latest topics.',
    },
    booster: {
      label: '500 detailed prompts',
      description: 'Rocket members unlock 500 prompts with deeper outlines and historical metadata.',
      content: 'Rocket unlocks the full 500 prompt vault with richer outlines, creation dates, and ready-to-launch start actions. Filters and search work across the entire set.',
    },
    master: {
      label: '500 prompts + AI',
      description: 'Owl unlocks the full 500 prompt vault plus on-demand AI prompt generation.',
      content: 'Owl unlocks the full 500 prompt vault plus instant AI generation. Generate new practice prompts and they will appear at the top of your library without reloading.',
    },
  }[__plan]), [__plan]);

  const activeDrafts = stats.recentAttempts.filter(attempt => attempt.status !== 'scored');
  const recentSubmissions = stats.recentAttempts.slice(0, 6);

  return (
    <WritingLayout plan={__plan} current="overview">
      {/* Accessibility announcement */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {/* Hero Section */}
      <DashboardHeader
        badge={
          <Badge variant="soft" tone={passReadiness ? 'success' : 'info'} size="sm">
            {passReadiness ? 'Redraft unlocked' : 'Stay consistent'}
          </Badge>
        }
        title="Your writing overview"
        description="Track readiness, review reminders, and hop into focused drills. Use the navigation above to explore the full prompt library and analyse your writing history."
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" href="/writing/library" size="lg">
              Browse prompt library
            </Button>
            <Button variant="outline" href="/writing/progress" size="lg">
              View drafts & feedback
            </Button>
            <Button variant="ghost" href="/writing/drills" size="lg">
              Jump into drills
            </Button>
          </div>
        }
        meta={
          <MetricCard
            title="Study window"
            value={
              <Badge variant="soft" tone="info" size="sm">
                {formatDate(planSummary.windowStart)} – {planSummary.windowEnd ? formatDate(planSummary.windowEnd) : 'TBD'}
              </Badge>
            }
          >
            <Separator />
            <div className="space-y-3">
              {planProgressItems.map((item) => (
                <ProgressItem
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  target={item.target}
                />
              ))}
            </div>
          </MetricCard>
        }
      />

      {/* Main Content Grid */}
      <div className={SECTION_SPACING}>
        {/* Prompt Access & Micro Prompt Section */}
        <DashboardGrid columns={2}>
          <DashboardSection
            title="Prompt access"
            description={currentPlanCopy.description}
            badge={<Badge variant="soft" tone="default" size="sm">{currentPlanCopy.label}</Badge>}
          >
            <div className="info-panel">
              <p className={TEXT_STYLES.caption}>{currentPlanCopy.content}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" href="/writing/library">
                Open prompt library
              </Button>
              <Button variant="ghost" href="/pricing?need=starter">
                Upgrade plans
              </Button>
            </div>
          </DashboardSection>

          <DashboardSection
            title="Daily micro prompt"
            description="A quick nudge to sharpen today's session."
            badge={<Badge variant="soft" tone="info" size="sm">Updated daily</Badge>}
          >
            <div className="info-panel">
              <p className={TEXT_STYLES.caption + " text-foreground"}>{microPromptState.message}</p>
            </div>
            
            {microPromptState.retakeReminder && (
              <div className="reminder-panel">
                {microPromptState.retakeReminder.message}
              </div>
            )}

            {microPromptError && (
              <p className={TEXT_STYLES.caption + " text-danger"}>{microPromptError}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={TEXT_STYLES.micro}>
                {microPromptState.lastSentAt 
                  ? `Last nudged ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(microPromptState.lastSentAt))}`
                  : 'Not delivered yet today'
                }
              </span>
              
              {!microPromptState.canSendWhatsApp && (
                <span className={TEXT_STYLES.micro}>
                  WhatsApp nudges require opt-in —{' '}
                  <Link href="/notifications" className="text-primary underline underline-offset-4">
                    manage settings
                  </Link>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                variant="primary"
                onClick={handleSendMicroPrompt}
                disabled={microPromptState.alreadySentToday && !microPromptLoading}
                loading={microPromptLoading}
              >
                {microPromptState.alreadySentToday ? 'Sent for today' : 'Send reminder now'}
              </Button>
              <Button size="sm" variant="ghost" onClick={refreshMicroPrompt}>
                Refresh tip
              </Button>
            </div>

            {microPromptState.alreadySentToday && (
              <p className={TEXT_STYLES.micro}>
                Tip already delivered today — check back tomorrow for a fresh focus cue.
              </p>
            )}
          </DashboardSection>
        </DashboardGrid>

        {/* Drafts & Submissions Section */}
        <DashboardGrid columns={2}>
          <DashboardSection
            title="Active drafts"
            description="Pick up where you left off with autosaved work."
            badge={<Badge variant="soft" tone="default" size="sm">{activeDrafts.length} active</Badge>}
          >
            {activeDrafts.length === 0 ? (
              <EmptyState
                title="No active drafts"
                description="Start a new attempt or revisit a scored attempt to launch a redraft."
              />
            ) : (
              <div className="space-y-4">
                {activeDrafts.slice(0, 3).map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} />
                ))}
              </div>
            )}
            <Button variant="ghost" href="/writing/progress">
              View full progress
            </Button>
          </DashboardSection>

          <DashboardSection
            title="Recent submissions"
            description="See what you submitted recently and track your scores."
            badge={<Badge variant="soft" tone="default" size="sm">Last {recentSubmissions.length}</Badge>}
          >
            {recentSubmissions.length === 0 ? (
              <EmptyState
                title="No attempts yet"
                description="Submit an essay to unlock AI feedback and trend tracking."
              />
            ) : (
              <div className="space-y-4">
                {recentSubmissions.map((attempt) => (
                  <AttemptCard key={attempt.id} attempt={attempt} showActions={false} />
                ))}
              </div>
            )}
            <Button variant="ghost" href="/writing/progress">
              View all attempts
            </Button>
          </DashboardSection>
        </DashboardGrid>

        {/* Resources Section */}
        <DashboardSection
          title="Boost your next attempt"
          description="Layer drills, reviews, and mock feedback to build a sharper writing routine."
          badge={<Badge variant="soft" tone="info" size="sm">Curated resources</Badge>}
        >
          <ResourceGrid>
            <ResourceLink
              href="/writing/drills"
              title="Skill drills"
              description="Target coherence, task achievement, and grammar with 10-minute micro drills."
            />
            <ResourceLink
              href="/writing/reviews"
              title="AI reviews"
              description="Compare attempts, highlight improvements, and plan your next rewrite."
            />
            <ResourceLink
              href="/writing/drills?tab=mocks"
              title="Mock library"
              description="Revisit scored mocks, analyse feedback themes, and schedule your next redraft."
            />
          </ResourceGrid>
        </DashboardSection>
      </div>
    </WritingLayout>
  );
};

// Add CSS to your global styles for these components:
/*
.dashboard-card {
  @apply rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md;
}

.resource-card {
  @apply flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 transition hover:border-primary/60 hover:bg-card;
}

.resource-link {
  @apply mt-auto text-sm font-medium text-primary group-hover:underline;
}

.info-panel {
  @apply rounded-2xl border border-dashed border-border/50 bg-muted/40 p-4;
}

.reminder-panel {
  @apply rounded-2xl border border-dashed border-border/40 bg-card/60 p-3 text-xs text-muted-foreground;
}
*/

export const getServerSideProps: GetServerSideProps<OverviewPageProps> = withPlanPage('starter')(async (ctx) => {
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

  // ... (rest of the getServerSideProps remains exactly the same)
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
    },
  } as any;
});

export default WritingOverview;