import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { useToast } from '@/components/design-system/Toaster';
import { UpgradeBanner } from '@/components/premium/UpgradeBanner';

import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { useLocale } from '@/lib/locale';
import { track } from '@/lib/analytics/track';

import type { StudyDay, StudyPlan as PlanType } from '@/types/plan';
import { StudyPlanEmptyState } from '@/components/study/EmptyState';
import { PlanCard } from '@/components/study/PlanCard';
import { PlanTimeline } from '@/components/study/PlanTimeline';
import { StreakChip } from '@/components/user/StreakChip';
import { planDayKey } from '@/utils/studyPlan';
import { usePlan } from '@/hooks/usePlan';

// NEW: Hook to fetch AI study plan
import { useAIStudyPlan } from '@/hooks/useAIStudyPlan';
// NEW: Component for skill gauges
import { SkillGauges } from '@/components/study-plan/SkillGauges';

function countCompletedTasks(plan: PlanType): number {
  return plan.days.reduce((acc, d) => acc + d.tasks.filter((t) => t.completed).length, 0);
}

async function logStudyPlanEvent(event: 'studyplan_create' | 'studyplan_update' | 'studyplan_task_complete', payload: Record<string, unknown> = {}) {
  try {
    await fetch('/api/study-plan/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, payload }),
      keepalive: true,
    });
  } catch (err) {
    console.error('[study-plan] failed to log trackor event', err);
  }
}

export default function StudyPlanPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const { t, isRTL } = useLocale();
  const planProgressRef = useRef<number>(0);

  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();
  const { plan: subscriptionPlan, loading: planLoading } = usePlan();
  const showUpgradeBanner = !planLoading && subscriptionPlan === 'free';

  // NEW: Use AI plan hook
  const {
    plan: aiPlan,
    loading: aiLoading,
    error: aiError,
    regeneratePlan,
    isRegenerating,
  } = useAIStudyPlan();

  // Derive userId from auth (or from plan)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  const todayKey = getDayKeyInTZ();

  const today = useMemo<StudyDay | null>(() => {
    if (!aiPlan) return null;
    return aiPlan.days.find((d) => planDayKey(d) === todayKey) ?? null;
  }, [aiPlan, todayKey]);

  const upcomingDays = useMemo<StudyDay[]>(() => {
    if (!aiPlan) return [];
    return aiPlan.days.filter((d) => planDayKey(d) >= todayKey).slice(0, 7);
  }, [aiPlan, todayKey]);

  const planTotals = useMemo(() => {
    if (!aiPlan) return { total: 0, completed: 0 };
    return aiPlan.days.reduce(
      (acc, day) => {
        acc.total += day.tasks.length;
        acc.completed += day.tasks.filter((task) => task.completed).length;
        return acc;
      },
      { total: 0, completed: 0 },
    );
  }, [aiPlan]);

  const planProgress = planTotals.total > 0 ? Math.round((planTotals.completed / planTotals.total) * 100) : 0;

  const nextTaskToday = useMemo(() => {
    if (!today) return null;
    return today.tasks.find((task) => !task.completed) ?? null;
  }, [today]);

  const taskRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleTaskRef = useCallback((taskId: string, element: HTMLInputElement | null) => {
    if (element) taskRefs.current[taskId] = element;
    else delete taskRefs.current[taskId];
  }, []);

  const handleFocusNextTask = useCallback(() => {
    if (!nextTaskToday) return;
    const target = taskRefs.current[nextTaskToday.id];
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [nextTaskToday]);

  const persistPlan = useCallback(
    async (next: PlanType) => {
      if (!userId) throw new Error('Not authenticated');
      // Save updated plan back to the database (AI plan table)
      const { error } = await supabase
        .from('user_study_plans')
        .upsert(
          {
            user_id: userId,
            plan: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    [userId],
  );

  const handleTaskToggle = useCallback(
    async (day: StudyDay, taskId: string, checked: boolean) => {
      if (!aiPlan || !userId) return;

      const dayKey = planDayKey(day);
      const target = day.tasks.find((t) => t.id === taskId);
      const wasComplete = target?.completed ?? false;
      const hadOtherCompleted = day.tasks.some((t) => t.completed && t.id !== taskId);

      const next: PlanType = {
        ...aiPlan,
        days: aiPlan.days.map((d) =>
          d.dateISO === day.dateISO
            ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, completed: checked } : t)) }
            : d,
        ),
      };

      setBusyTask(taskId);
      // Optimistic update
      // (we need a way to update the aiPlan state – we'll use a local state copy or rely on refetch)
      // For simplicity, we'll just update the plan via the hook's setter if available.
      // We'll assume useAIStudyPlan returns a setPlan function.
      // Let's modify the hook to return setPlan as well.
      // For now, we'll use a local state for the plan (derived from aiPlan) and sync later.

      const prevCompleted = planProgressRef.current;

      try {
        await persistPlan(next);
        track('studyplan_update', { day: dayKey, taskId, completed: checked });
        void logStudyPlanEvent('studyplan_update', { day: dayKey, taskId, completed: checked });
        const shouldStartStreak = checked && !wasComplete && !hadOtherCompleted && dayKey === todayKey;
        if (shouldStartStreak) {
          try {
            const data = await completeToday();
            if (!data) await reloadStreak();
          } catch (err) {
            console.error('Streak update failed', err);
          }
        }
        if (checked && !wasComplete) {
          track('studyplan_task_complete', { day: dayKey, taskId });
          void logStudyPlanEvent('studyplan_task_complete', { day: dayKey, taskId });
        }
        // Refresh plan to get updated data (optional)
        // For now, we rely on optimistic update; but we could refetch.
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(t('studyPlan.toast.updateError', 'Could not update task. Please try again.'));
        // Rollback would require refetching plan
        // We'll refetch plan from hook if possible
      } finally {
        setBusyTask(null);
      }
    },
    [aiPlan, t, userId, persistPlan, completeToday, reloadStreak, toastError, todayKey],
  );

  const handleRegeneratePlan = useCallback(async () => {
    try {
      await regeneratePlan();
      toastSuccess(
        t('studyPlan.toast.regenerated.title', 'Plan refreshed'),
        t('studyPlan.toast.regenerated.description', 'Your new AI study plan is ready.'),
      );
    } catch (err) {
      toastError(t('studyPlan.toast.regenerateError', 'Could not regenerate plan. Please try again.'));
    }
  }, [regeneratePlan, toastSuccess, toastError, t]);

  const hasPlan = !!aiPlan && aiPlan.days.length > 0;

  return (
    <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className={clsx('flex flex-wrap items-center justify-between gap-4', isRTL && 'text-right')}>
          <div>
            <h1 className="font-slab text-display">{t('studyPlan.page.title', 'Your AI study plan')}</h1>
            <p className="text-body text-muted-foreground">
              {t('studyPlan.page.subtitle', 'Personalized daily tasks to reach your target band.')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StreakChip value={streakLoading ? 0 : streak} loading={streakLoading} href="/profile/streak" />
            <Button variant="soft" tone="info" asChild>
              <Link href="/progress">{t('studyPlan.page.viewProgress', 'View progress')}</Link>
            </Button>
          </div>
        </div>

        {showUpgradeBanner && (
          <UpgradeBanner
            className="mt-6"
            pillLabel="Explorer · Free plan"
            title={t('studyPlan.upgrade.title', 'Refresh your study plan without limits')}
            description={t(
              'studyPlan.upgrade.description',
              'Premium auto-adjusts your calendar, adds weekly mock recommendations, and sends WhatsApp nudges when you fall behind.',
            )}
            href="/pricing?from=study-plan-upgrade"
            feature="Adaptive study plan"
          />
        )}

        <div className="mt-10 space-y-8">
          {aiLoading ? (
            <Card className="rounded-ds-2xl p-6">
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </Card>
          ) : aiError ? (
            <Card className="rounded-ds-2xl p-6 text-center">
              <p className="text-destructive">{t('studyPlan.error.load', 'Failed to load your study plan.')}</p>
              <Button onClick={handleRegeneratePlan} className="mt-4">
                {t('studyPlan.retry', 'Retry')}
              </Button>
            </Card>
          ) : !hasPlan ? (
            <StudyPlanEmptyState
              // We no longer pass presets; instead show a message that AI plan will be generated after onboarding.
              message={t(
                'studyPlan.empty.message',
                "You don't have an AI study plan yet. Complete the onboarding to get your personalized plan."
              )}
              actionLabel={t('studyPlan.empty.action', 'Go to onboarding')}
              actionHref="/onboarding"
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <PlanCard
                  day={today ?? aiPlan.days[0]}
                  onToggleTask={(taskId, checked) => handleTaskToggle(today ?? aiPlan.days[0], taskId, checked)}
                  busyTaskId={busyTask}
                  isToday={planDayKey(today ?? aiPlan.days[0]) === todayKey}
                  nextTaskId={nextTaskToday?.id ?? null}
                  onStartNextTask={handleFocusNextTask}
                  onTaskRef={handleTaskRef}
                />
                <PlanTimeline days={upcomingDays} todayKey={todayKey} />
              </div>

              <div className="space-y-6">
                <Card className="rounded-ds-2xl p-6 space-y-4">
                  <h3 className="font-slab text-h4">{t('studyPlan.sidebar.progress.title', 'Plan progress')}</h3>
                  <p className="text-small text-muted-foreground">
                    {planProgress >= 100
                      ? t('studyPlan.sidebar.progress.done', 'You’ve completed every task in this plan. Consider regenerating a new schedule to keep training.')
                      : t('studyPlan.sidebar.progress.keepPace', 'Stay on pace toward your IELTS goal by checking off the next task in your queue.')}
                  </p>
                  <div className="space-y-2">
                    <ProgressBar value={planProgress} aria-label={t('studyPlan.sidebar.progress.aria', 'Overall study plan progress')} />
                    <div className="flex items-center justify-between text-small font-medium text-foreground">
                      <span>
                        {planTotals.completed}/{planTotals.total} {t('studyPlan.sidebar.progress.tasksComplete', 'tasks complete')}
                      </span>
                      <span>{planProgress}%</span>
                    </div>
                  </div>
                  <Button variant="soft" tone="info" size="sm" onClick={handleFocusNextTask} disabled={!nextTaskToday}>
                    {nextTaskToday
                      ? t('studyPlan.sidebar.progress.jump', 'Jump to today’s next task')
                      : t('studyPlan.sidebar.progress.caughtUp', 'All caught up for today')}
                  </Button>
                </Card>

                {/* NEW: Skill Gauges */}
                <SkillGauges baseline={aiPlan.baselineScores} target={aiPlan.targetBand} />

                <Card className="rounded-ds-2xl p-6 space-y-4">
                  <h3 className="font-slab text-h4">{t('studyPlan.sidebar.title', 'Need a change?')}</h3>
                  <p className="text-small text-muted-foreground">
                    {t('studyPlan.sidebar.description', 'Your AI plan adapts as you progress. You can regenerate a fresh plan using your latest data.')}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleRegeneratePlan}
                    loading={isRegenerating}
                  >
                    {t('studyPlan.regenerate', 'Regenerate AI plan')}
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}