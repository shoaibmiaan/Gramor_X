import React, { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import WritingExamRoom from '@/components/writing/WritingExamRoom';
import { Button } from '@/components/design-system/Button';
import { KeyboardAwareSheet } from '@/components/mobile/KeyboardAwareSheet';
import { PushOptInCard } from '@/components/mobile/PushOptInCard';
import { InstallBanner } from '@/components/mobile/InstallBanner';
import { getServerClient } from '@/lib/supabaseServer';
import type { WritingExamPrompts } from '@/types/writing';
import type { PlanId } from '@/types/pricing';
import { planAllows, writingMockLimit } from '@/lib/plan/gates';
import { withPlan } from '@/lib/plan/withPlan';
import { useInstalledApp } from '@/hooks/useInstalledApp';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { clearMockAttemptId } from '@/lib/mock/state';

type PageProps = {
  attemptId: string;
  durationSeconds: number;
  prompts: WritingExamPrompts;
  initialDraft: {
    task1?: { essay: string; wordCount: number };
    task2?: { essay: string; wordCount: number };
    updatedAt?: string | null;
  } | null;
  mockId?: string | null;

  /** server-computed count of attempts started today */
  usedToday: number;
};

const mapPrompt = (row: any) => {
  const topic: string | null =
    (typeof row.topic === 'string' && row.topic) ? row.topic : null;

  const promptText: string | null =
    (typeof row.prompt_text === 'string' && row.prompt_text) ? row.prompt_text
    : (row?.outline_json?.outline_summary ? String(row.outline_json.outline_summary) : null) ||
      topic || null;

  const taskType: string =
    (typeof row.task_type === 'string' && row.task_type) ? row.task_type : 'task2';

  return {
    id: row.id,
    slug: row.slug ?? row.id,
    title: topic ?? 'Untitled',
    promptText,
    taskType,
    module: row.module ?? 'academic',
    difficulty: row.difficulty ?? null,
    source: row.source ?? null,
    tags: row.tags ?? null,
    estimatedMinutes: row.estimated_minutes ?? null,
    wordTarget: row.word_target ?? null,
    metadata: row.metadata ?? null,
  };
};

const WritingMockWorkspacePage: React.FC<PageProps & { __plan?: PlanId }> = ({
  __plan = 'starter',
  attemptId,
  prompts,
  durationSeconds,
  initialDraft,
  mockId = null,
  usedToday,
}) => {
  const router = useRouter();
  const plan = __plan;

  // Quiet test-taking experience (keeps noise down)
  const QUIET_MODE = true;

  const limit = writingMockLimit(plan);
  const remaining = Math.max(0, limit - (usedToday ?? 0));

  const mockLimit = limit;
  const boosterMockLimit = writingMockLimit('booster');
  const masterMockLimit = writingMockLimit('master');
  const formatMockLimit = (l: number) => `${l} daily writing mock test${l === 1 ? '' : 's'}`;

  const { isInstalled } = useInstalledApp();
  const { promptEvent, clearPrompt } = useInstallPrompt();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'default';
    return Notification.permission;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    setPushStatus(Notification.permission);
  }, []);

  const supportsPush = typeof window !== 'undefined' && typeof Notification !== 'undefined';

  const shouldShowInstall = useMemo(() => {
    if (QUIET_MODE) return false;
    if (!planAllows(plan, 'writing.install.prompt')) return false;
    if (isInstalled || installDismissed) return false;
    return Boolean(promptEvent);
  }, [QUIET_MODE, installDismissed, isInstalled, plan, promptEvent]);

  const shouldShowPush = useMemo(() => {
    if (QUIET_MODE) return false;
    if (!planAllows(plan, 'writing.push.optin')) return false;
    if (!supportsPush) return false;
    if (pushStatus === 'granted' || pushDismissed) return false;
    return true;
  }, [QUIET_MODE, plan, pushDismissed, pushStatus, supportsPush]);

  const hasEngagementPrompts = shouldShowInstall || shouldShowPush;

  useEffect(() => {
    if (!hasEngagementPrompts) setSheetOpen(false);
  }, [hasEngagementPrompts]);

  const handleInstallComplete = (outcome: 'accepted' | 'dismissed') => {
    setInstallDismissed(true);
    clearPrompt();
    if (outcome === 'accepted') setSheetOpen(false);
  };

  const handlePushGranted = () => {
    setPushStatus('granted');
    setSheetOpen(false);
  };

  const handlePushDismiss = () => setPushDismissed(true);

  return (
    <>
      {/* Calm, universal heading */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">IELTS Writing</p>
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">Exam Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete Task 1 and Task 2 within the time limit. Autosave is on.
          </p>
        </div>

        {/* Quota chip (visible when you still have attempts) */}
        {remaining > 0 && (
          <div
            className="ml-2 inline-flex h-8 items-center rounded-full border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground"
            aria-live="polite"
          >
            {usedToday}/{mockLimit} today
          </div>
        )}
      </div>

      {/* Clear notice when the daily quota is exhausted (no surprise redirect later) */}
      {remaining === 0 && (
        <div
          className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          You’ve reached your daily limit for writing mock tests ({mockLimit}/{mockLimit}). Try again tomorrow
          or{' '}
          <a href={`/pricing/overview?reason=writing_quota&used=${usedToday}&limit=${mockLimit}`} className="underline">
            see plans
          </a>
          .
        </div>
      )}

      {/* Upsell muted while taking test */}
      {!QUIET_MODE && plan !== 'booster' && plan !== 'master' ? (
        <div className="mb-4 rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
          Starter plans include {formatMockLimit(mockLimit)}. Upgrade to Booster for {formatMockLimit(boosterMockLimit)} and
          advanced analytics, or go Master for {formatMockLimit(masterMockLimit)} plus exportable reports and printable
          certificates.
        </div>
      ) : null}

      {/* Engagement prompts hidden in quiet mode */}
      {hasEngagementPrompts ? (
        <div className="mb-4 hidden gap-4 md:grid md:grid-cols-2">
          {shouldShowInstall ? (
            <InstallBanner promptEvent={promptEvent} onComplete={handleInstallComplete} onDismiss={handleInstallComplete} />
          ) : null}
          {shouldShowPush ? <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} /> : null}
        </div>
      ) : null}

      {hasEngagementPrompts ? (
        <div className="mb-4 flex justify-center md:hidden">
          <Button size="lg" variant="secondary" onClick={() => setSheetOpen(true)}>
            Stay connected
          </Button>
        </div>
      ) : null}

      <WritingExamRoom
        attemptId={attemptId}
        prompts={prompts}
        durationSeconds={durationSeconds}
        initialDraft={initialDraft ?? undefined}
        onSubmitSuccess={(result) => {
          if (mockId) clearMockAttemptId('writing', mockId);
          void router.push(`/writing/mock/${result.attemptId}/evaluating`);
        }}
      />

      <KeyboardAwareSheet
        open={sheetOpen && hasEngagementPrompts}
        title="Stay connected"
        description="Install the app or enable notifications so you never miss feedback."
        onClose={() => setSheetOpen(false)}
      >
        {shouldShowInstall ? (
          <InstallBanner promptEvent={promptEvent} onComplete={handleInstallComplete} onDismiss={handleInstallComplete} />
        ) : null}
        {shouldShowPush ? <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} /> : null}
      </KeyboardAwareSheet>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = withPlan('starter')(async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { redirect: { destination: '/welcome', permanent: false } };
  }

  const params = ctx.params as { mockId: string };
  const queryAttemptId = typeof ctx.query.attemptId === 'string' ? ctx.query.attemptId : null;
  const attemptId = queryAttemptId ?? params.mockId;
  if (!attemptId) return { notFound: true };

  // Count user's writing attempts started today (UTC day for simplicity)
  const startOfDayUTC = new Date();
  startOfDayUTC.setUTCHours(0, 0, 0, 0);

  const { count: usedToday = 0 } = await supabase
    .from('exam_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    // If you track module in metadata JSON: require { "module": "writing" }
    .contains('metadata', { module: 'writing' })
    .gte('created_at', startOfDayUTC.toISOString());

  // Load attempt
  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', attemptId)
    .maybeSingle();

  if (error || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const metadata = (attempt.metadata as any) ?? {};
  const mockIdFromMetadata = typeof metadata.mockId === 'string' ? metadata.mockId : null;
  const fallbackMockId = queryAttemptId ? params.mockId : null;
  const mockId = mockIdFromMetadata ?? fallbackMockId;
  const promptIds = metadata.promptIds ?? {};

  const { data: promptRows } = await supabase
    .from('writing_prompts')
    .select('*')
    .in('id', [promptIds.task1, promptIds.task2].filter(Boolean));

  const task1Row = promptRows?.find((row) => row.id === promptIds.task1) ?? null;
  const task2Row = promptRows?.find((row) => row.id === promptIds.task2) ?? null;

  if (!task1Row || !task2Row) return { notFound: true };

  const prompts: WritingExamPrompts = {
    task1: mapPrompt(task1Row),
    task2: mapPrompt(task2Row),
  };

  const { data: autosaveEvent } = await supabase
    .from('exam_events')
    .select('payload, occurred_at')
    .eq('attempt_id', attemptId)
    .eq('event_type', 'autosave')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialDraft: PageProps['initialDraft'] = null;

  if (autosaveEvent?.payload) {
    const payload = autosaveEvent.payload as any;
    initialDraft = {
      updatedAt: autosaveEvent.occurred_at ?? null,
      task1: payload?.tasks?.task1
        ? { essay: payload.tasks.task1.content ?? '', wordCount: payload.tasks.task1.wordCount ?? 0 }
        : undefined,
      task2: payload?.tasks?.task2
        ? { essay: payload.tasks.task2.content ?? '', wordCount: payload.tasks.task2.wordCount ?? 0 }
        : undefined,
    };
  } else {
    const { data: responseRows } = await supabase
      .from('writing_responses')
      .select('task, answer_text, word_count')
      .eq('exam_attempt_id', attemptId);

    if (responseRows && responseRows.length > 0) {
      const draft: Record<string, { essay: string; wordCount: number }> = {};
      responseRows.forEach((row) => {
        if (row.task === 'task1' || row.task === 'task2') {
          draft[row.task] = {
            essay: row.answer_text ?? '',
            wordCount: row.word_count ?? 0,
          };
        }
      });
      if (Object.keys(draft).length > 0) {
        initialDraft = {
          task1: draft.task1,
          task2: draft.task2,
          updatedAt: attempt.updated_at ?? attempt.created_at ?? null,
        };
      }
    }
  }

  return {
    props: {
      attemptId,
      durationSeconds: attempt.duration_seconds ?? 60 * 60,
      prompts,
      initialDraft: initialDraft ?? null,
      mockId,
      usedToday,
    },
  };
});

export default WritingMockWorkspacePage;