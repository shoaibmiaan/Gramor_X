import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Separator } from '@/components/design-system/Separator';
import { withPlanPage } from '@/lib/withPlanPage';
import { getServerClient } from '@/lib/supabaseServer';
import type { Database } from '@/types/supabase';
import type { WritingTaskType } from '@/lib/writing/schemas';
import {
  buildRetakeReminder,
  ensureNotificationChannels,
  getDailyMicroPrompt,
  shouldSendMicroPromptToday,
} from '@/lib/writing/notifications';

interface PromptCard {
  id: string;
  slug: string;
  topic: string;
  taskType: WritingTaskType;
  difficulty: number;
  outlineSummary: string | null;
}

interface AttemptSummary {
  id: string;
  promptSlug: string;
  promptTopic: string;
  status: Database['public']['Enums']['writing_attempt_status'];
  updatedAt: string;
  wordCount: number;
  taskType: WritingTaskType;
  overallBand: number | null;
  hasFeedback: boolean;
}

interface ReadinessSummary {
  pass: boolean;
  missing: string[];
}

interface PageProps {
  prompts: PromptCard[];
  drafts: AttemptSummary[];
  recent: AttemptSummary[];
  readiness: ReadinessSummary | null;
  plan: {
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
}

const statusLabel: Record<AttemptSummary['status'], string> = {
  draft: 'Draft in progress',
  submitted: 'Scoring pending',
  scored: 'Scored',
};

const difficultyLabel = (value: number) => {
  if (value <= 1) return 'Beginner';
  if (value === 2) return 'Intermediate';
  if (value === 3) return 'Upper‑intermediate';
  if (value === 4) return 'Advanced';
  return 'Band 8+';
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));

const RETAKE_PLAN_TARGETS = { redrafts: 6, drills: 8, mocks: 2 } as const;

const WritingDashboard = ({ prompts, drafts, recent, readiness, plan, microPrompt }: PageProps) => {
  const [startingPromptId, setStartingPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [microPromptState, setMicroPromptState] = useState<PageProps['microPrompt']>(microPrompt);
  const [microPromptLoading, setMicroPromptLoading] = useState(false);
  const [microPromptError, setMicroPromptError] = useState<string | null>(null);

  const passReadiness = readiness?.pass ?? false;
  const missingSummary = readiness?.missing ?? [];

  const planTargets = RETAKE_PLAN_TARGETS;

  const sortedPrompts = useMemo(
    () =>
      [...prompts].sort((a, b) => {
        const diffDelta = a.difficulty - b.difficulty;
        if (diffDelta !== 0) return diffDelta;
        return a.topic.localeCompare(b.topic);
      }),
    [prompts],
  );

  const refreshMicroPrompt = useCallback(async () => {
    try {
      const response = await fetch('/api/writing/notifications/micro-prompt');
      const payload = (await response.json()) as
        | ({ ok: true; message: string; lastSentAt: string | null; channels: string[]; canSendWhatsApp: boolean; alreadySentToday: boolean; retakeReminder: PageProps['microPrompt']['retakeReminder'] })
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
    } catch (err) {
      setMicroPromptError(err instanceof Error ? err.message : 'Unable to refresh micro prompt');
    }
  }, []);

  const handleSendMicroPrompt = useCallback(async () => {
    setMicroPromptLoading(true);
    setMicroPromptError(null);
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
    } finally {
      setMicroPromptLoading(false);
    }
  }, [refreshMicroPrompt]);

  const handleStart = async (prompt: PromptCard) => {
    setStartingPromptId(prompt.id);
    setError(null);
    try {
      const response = await fetch('/api/writing/attempts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptId: prompt.id, taskType: prompt.taskType }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string })?.error ?? 'Failed to start attempt');
      }

      const payload = (await response.json()) as { attemptId: string };
      window.location.assign(`/writing/${prompt.slug}?attemptId=${payload.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error starting attempt');
    } finally {
      setStartingPromptId(null);
    }
  };

  return (
    <Container className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Writing studio</h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Draft confidently, unlock targeted drills, and review detailed scoring for Task 1 and Task 2 attempts. Autosave keeps your
            work safe, while readiness gates help you schedule meaningful redrafts.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
        </header>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="card-surface flex flex-col gap-6 p-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Prompts</h2>
              <p className="text-sm text-muted-foreground">Choose a prompt to launch a timed editor with autosave.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedPrompts.map((prompt) => (
                <Card key={prompt.id} className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="soft" tone="info" size="sm" className="capitalize">
                      {prompt.taskType === 'task1' ? 'Task 1' : 'Task 2'}
                    </Badge>
                    <Badge variant="soft" tone="default" size="sm">{difficultyLabel(prompt.difficulty)}</Badge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{prompt.topic}</h3>
                    {prompt.outlineSummary && <p className="text-sm text-muted-foreground">{prompt.outlineSummary}</p>}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={startingPromptId === prompt.id}
                      onClick={() => handleStart(prompt)}
                    >
                      Start writing
                    </Button>
                    <Button size="sm" variant="outline" href={`/writing/${prompt.slug}`}>View prompt</Button>
                  </div>
                </Card>
              ))}
            </div>
            {sortedPrompts.length === 0 && (
              <EmptyState
                title="No prompts yet"
                description="Admins can seed writing prompts from Supabase. Check back soon for new practice sets."
              />
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card id="retake-plan" className="card-surface flex flex-col gap-4 p-6">
              <h2 className="text-xl font-semibold text-foreground">Readiness gate</h2>
              {readiness ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="soft" tone={passReadiness ? 'success' : 'warning'} size="sm">
                      {passReadiness ? 'Ready for redraft' : 'Action needed'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {passReadiness ? 'You can start a redraft attempt.' : 'Complete the steps below to unlock redraft.'}
                    </span>
                  </div>
                  {!passReadiness && (
                    <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground">
                      {missingSummary.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {passReadiness && (
                    <p className="text-sm text-muted-foreground">
                      Keep momentum going by scheduling a redraft within the next two weeks for best gains.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete drills and submit attempts to generate a readiness score.
                </p>
              )}
              <Separator />
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>New to readiness gates? Complete two targeted drills and submit one scored attempt to unlock redrafts.</p>
                <Link href="/writing" className="text-primary underline underline-offset-4">Learn more</Link>
              </div>
            </Card>

            <Card className="card-surface flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Daily micro prompt</h2>
                  <p className="text-sm text-muted-foreground">
                    One-sentence nudge to keep today&apos;s writing focused.
                  </p>
                </div>
                <Badge variant="soft" tone="info" size="sm">
                  Updated daily
                </Badge>
              </div>
              <p className="rounded-2xl bg-muted/60 p-3 text-sm text-foreground">{microPromptState.message}</p>

              {microPromptState.retakeReminder && (
                <div className="rounded-2xl border border-dashed border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                  {microPromptState.retakeReminder.message}
                </div>
              )}

              {microPromptError && <p className="text-sm text-danger">{microPromptError}</p>}

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {microPromptState.lastSentAt
                    ? `Last nudged ${formatDateTime(microPromptState.lastSentAt)}`
                    : 'Not delivered yet today'}
                </span>
                {!microPromptState.canSendWhatsApp && (
                  <span>
                    WhatsApp nudges require opt-in — manage in{' '}
                    <Link href="/notifications" className="text-primary underline underline-offset-4">
                      notification settings
                    </Link>
                    .
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
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
                <p className="text-xs text-muted-foreground">
                  Tip already delivered today — check back tomorrow for a fresh focus cue.
                </p>
              )}
            </Card>

            <Card className="card-surface flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">14-day retake plan</h2>
                <Badge variant="soft" tone="info" size="sm">
                  {formatDate(plan.windowStart)} – {plan.windowEnd ? formatDate(plan.windowEnd) : 'TBD'}
                </Badge>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center justify-between">
                  <span>Redrafts completed</span>
                  <span className="text-foreground font-medium">{plan.redraftsCompleted}/{planTargets.redrafts}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Micro-drills logged</span>
                  <span className="text-foreground font-medium">{plan.drillsCompleted}/{planTargets.drills}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Mock attempts reviewed</span>
                  <span className="text-foreground font-medium">{plan.mocksCompleted}/{planTargets.mocks}</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" href="/writing/drills">
                  View drills
                </Button>
                <Button size="sm" variant="ghost" href="/writing">
                  Plan guidance
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card id="section-continue-drafts" className="card-surface flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Continue drafts</h2>
              <Badge variant="soft" tone="default" size="sm">{drafts.length} active</Badge>
            </div>
            {drafts.length === 0 ? (
              <EmptyState
                title="No active drafts"
                description="Start a new attempt or revisit a scored attempt to launch a redraft."
              />
            ) : (
              <ul className="space-y-3">
                {drafts.map((attempt) => (
                  <li key={attempt.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="recent-attempts" className="card-surface flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent attempts</h2>
              <Badge variant="soft" tone="default" size="sm">Last 6</Badge>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                title="No attempts yet"
                description="Submit an essay to unlock AI feedback and trend tracking."
              />
            ) : (
              <ul className="space-y-3">
                {recent.map((attempt) => (
                  <li key={attempt.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
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
                      {attempt.status === 'scored' ? (
                        <Button size="sm" variant="primary" href={`/writing/review/${attempt.id}`}>
                          View feedback
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" href={`/writing/${attempt.promptSlug}?attemptId=${attempt.id}`}>
                          Check status
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      </div>
    </Container>
  );
};

const mapPromptRow = (
  row: Database['public']['Tables']['writing_prompts']['Row'],
): PromptCard => {
  const outline = (row.outline_json ?? null) as { summary?: unknown } | null;
  const summaryValue = typeof outline?.summary === 'string' ? outline.summary : null;

  return {
    id: row.id,
    slug: row.slug,
    topic: row.topic,
    taskType: row.task_type as WritingTaskType,
    difficulty: row.difficulty ?? 2,
    outlineSummary: summaryValue,
  };
};

const mapAttemptRow = (
  row: Database['public']['Tables']['writing_attempts']['Row'] & {
    prompt: Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null;
  },
): AttemptSummary => ({
  id: row.id,
  promptSlug: row.prompt?.slug ?? 'prompt',
  promptTopic: row.prompt?.topic ?? 'Prompt',
  status: row.status,
  updatedAt: row.updated_at,
  wordCount: row.word_count ?? 0,
  taskType: row.task_type as WritingTaskType,
  overallBand: row.overall_band,
  hasFeedback: !!row.feedback_json,
});

export const getServerSideProps: GetServerSideProps<PageProps> = withPlanPage('free')(async (ctx) => {
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

  const { data: promptRows } = await supabase
    .from('writing_prompts')
    .select('id, slug, topic, task_type, difficulty, outline_json')
    .order('difficulty', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(12);

  const { data: attemptRows } = await supabase
    .from('writing_attempts')
    .select('id, prompt_id, status, updated_at, word_count, overall_band, task_type, feedback_json, writing_prompts (slug, topic)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(12);

  const prompts = (promptRows ?? []).map(mapPromptRow);
  const attempts = (attemptRows ?? []).map((row) =>
    mapAttemptRow({
      ...row,
      prompt: row.writing_prompts as Pick<Database['public']['Tables']['writing_prompts']['Row'], 'slug' | 'topic'> | null,
    }),
  );

  const drafts = attempts.filter((attempt) => attempt.status !== 'scored');
  const recent = attempts.slice(0, 6);

  const { data: readinessRow } = await supabase
    .from('writing_readiness')
    .select('status, gates_json')
    .eq('user_id', user.id)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

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
      prompts,
      drafts,
      recent,
      readiness,
      plan: {
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
    },
  };
});

export default WritingDashboard;
