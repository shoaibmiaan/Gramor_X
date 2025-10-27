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
import { withPlanPage } from '@/lib/withPlanPage';
import { useInstalledApp } from '@/hooks/useInstalledApp';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

type PageProps = {
  attemptId: string;
  durationSeconds: number;
  prompts: WritingExamPrompts;
  initialDraft: {
    task1?: { essay: string; wordCount: number };
    task2?: { essay: string; wordCount: number };
    updatedAt?: string | null;
  } | null;
};

const mapPrompt = (row: any) => ({
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

const WritingMockPage: React.FC<PageProps & { __plan?: PlanId }> = ({
  __plan = 'starter',
  attemptId,
  prompts,
  durationSeconds,
  initialDraft,
}) => {
  const router = useRouter();
  const plan = __plan;
  const mockLimit = writingMockLimit(plan);
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
    if (!planAllows(plan, 'writing.install.prompt')) return false;
    if (isInstalled || installDismissed) return false;
    return Boolean(promptEvent);
  }, [installDismissed, isInstalled, plan, promptEvent]);

  const shouldShowPush = useMemo(() => {
    if (!planAllows(plan, 'writing.push.optin')) return false;
    if (!supportsPush) return false;
    if (pushStatus === 'granted' || pushDismissed) return false;
    return true;
  }, [plan, pushDismissed, pushStatus, supportsPush]);

  const hasEngagementPrompts = shouldShowInstall || shouldShowPush;

  useEffect(() => {
    if (!hasEngagementPrompts) {
      setSheetOpen(false);
    }
  }, [hasEngagementPrompts]);

  const handleInstallComplete = (outcome: 'accepted' | 'dismissed') => {
    setInstallDismissed(true);
    clearPrompt();
    if (outcome === 'accepted') {
      setSheetOpen(false);
    }
  };

  const handlePushGranted = () => {
    setPushStatus('granted');
    setSheetOpen(false);
  };

  const handlePushDismiss = () => {
    setPushDismissed(true);
  };

  return (
    <>
      {plan !== 'booster' && plan !== 'master' ? (
        <div className="mb-4 rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
          Starter plans include {mockLimit} daily writing mock{mockLimit === 1 ? '' : 's'}. Upgrade to Booster for unlimited
          attempts, exportable reports, and printable certificates.
        </div>
      ) : null}
      {hasEngagementPrompts ? (
        <div className="mb-4 hidden gap-4 md:grid md:grid-cols-2">
          {shouldShowInstall ? (
            <InstallBanner promptEvent={promptEvent} onComplete={handleInstallComplete} onDismiss={handleInstallComplete} />
          ) : null}
          {shouldShowPush ? (
            <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} />
          ) : null}
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
          void router.push(`/mock/writing/results/${result.attemptId}`);
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
        {shouldShowPush ? (
          <PushOptInCard onGranted={handlePushGranted} onDismiss={handlePushDismiss} />
        ) : null}
      </KeyboardAwareSheet>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = withPlanPage('starter')(async (ctx) => {
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

  const { id } = ctx.params as { id: string };

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !attempt || attempt.user_id !== user.id) {
    return { notFound: true };
  }

  const metadata = (attempt.metadata as any) ?? {};
  const promptIds = metadata.promptIds ?? {};

  const promptRows = await supabase
    .from('writing_prompts')
    .select('*')
    .in('id', [promptIds.task1, promptIds.task2].filter(Boolean));

  const task1Row = promptRows.data?.find((row) => row.id === promptIds.task1);
  const task2Row = promptRows.data?.find((row) => row.id === promptIds.task2);

  if (!task1Row || !task2Row) {
    return { notFound: true };
  }

  const prompts: WritingExamPrompts = {
    task1: mapPrompt(task1Row),
    task2: mapPrompt(task2Row),
  };

  const { data: autosaveEvent } = await supabase
    .from('exam_events')
    .select('payload, occurred_at')
    .eq('attempt_id', id)
    .eq('event_type', 'autosave')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialDraft: PageProps['initialDraft'] = null;

  if (autosaveEvent?.payload) {
    const payload = autosaveEvent.payload as any;
    initialDraft = {
      updatedAt: autosaveEvent.occurred_at,
      task1: payload.tasks?.task1
        ? { essay: payload.tasks.task1.content ?? '', wordCount: payload.tasks.task1.wordCount ?? 0 }
        : undefined,
      task2: payload.tasks?.task2
        ? { essay: payload.tasks.task2.content ?? '', wordCount: payload.tasks.task2.wordCount ?? 0 }
        : undefined,
    };
  } else {
    const { data: responseRows } = await supabase
      .from('writing_responses')
      .select('task, answer_text, word_count')
      .eq('exam_attempt_id', id);

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
          updatedAt: attempt.updated_at ?? attempt.created_at,
        };
      }
    }
  }

  return {
    props: {
      attemptId: id,
      durationSeconds: attempt.duration_seconds ?? 60 * 60,
      prompts,
      initialDraft: initialDraft ?? null,
    },
  };
});

export default WritingMockPage;
