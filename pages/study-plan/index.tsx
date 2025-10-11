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
import { generateStudyPlan } from '@/lib/studyPlan';
import { useLocale } from '@/lib/locale';
import { track } from '@/lib/analytics/track';

import type { StudyDay, StudyPlan as PlanType } from '@/types/plan';
import { StudyPlanEmptyState, type StudyPlanPreset } from '@/components/study/EmptyState';
import { PlanCard } from '@/components/study/PlanCard';
import { PlanTimeline } from '@/components/study/PlanTimeline';
import { StreakChip } from '@/components/user/StreakChip';
import { coerceStudyPlan, planDayKey } from '@/utils/studyPlan';
import { usePlan } from '@/hooks/usePlan';

const PRESETS: ReadonlyArray<StudyPlanPreset> = [
  {
    id: 'balanced-4w',
    titleKey: 'studyPlan.presets.balanced.title',
    descriptionKey: 'studyPlan.presets.balanced.description',
    weeks: 4,
    highlightKey: 'studyPlan.presets.balanced.highlight',
  },
  {
    id: 'speaking-boost',
    titleKey: 'studyPlan.presets.speaking.title',
    descriptionKey: 'studyPlan.presets.speaking.description',
    weeks: 2,
    highlightKey: 'studyPlan.presets.speaking.highlight',
  },
  {
    id: 'listening-sprint',
    titleKey: 'studyPlan.presets.listening.title',
    descriptionKey: 'studyPlan.presets.listening.description',
    weeks: 1,
    highlightKey: 'studyPlan.presets.listening.highlight',
  },
];

const PRESET_TARGETS: Record<string, number> = {
  'balanced-4w': 7,
  'speaking-boost': 7,
  'listening-sprint': 7,
};

const PRESET_AVAILABILITY: Record<string, ReadonlyArray<string>> = {
  'balanced-4w': ['Mon', 'Wed', 'Fri', 'Sun'],
  'speaking-boost': ['Tue', 'Thu', 'Sat'],
  'listening-sprint': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
};

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

function createPlanFromPreset(preset: StudyPlanPreset, userId: string): PlanType {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const exam = new Date(start);
  exam.setUTCDate(exam.getUTCDate() + preset.weeks * 7 - 1);

  const weaknesses =
    preset.id === 'speaking-boost'
      ? ['speaking:fluency', 'writing:task2 coherence']
      : preset.id === 'listening-sprint'
      ? ['listening:maps', 'listening:matching']
      : undefined;

  const availability = PRESET_AVAILABILITY[preset.id] ?? PRESET_AVAILABILITY['balanced-4w'];
  const targetBand = PRESET_TARGETS[preset.id] ?? 7;

  return generateStudyPlan({
    userId,
    startISO: start.toISOString(),
    examDateISO: exam.toISOString(),
    targetBand,
    availability,
    weaknesses,
  });
}

export default function StudyPlanPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const { t, isRTL } = useLocale();
  const planProgressRef = useRef<number>(0);

  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();
  const { plan: subscriptionPlan, loading: planLoading } = usePlan();
  const showUpgradeBanner = !planLoading && subscriptionPlan === 'free';

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setUserId(null);
        setPlan(null);
        planProgressRef.current = 0;
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('study_plans')
        .select('plan_json,start_iso,weeks,goal_band')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        setPlan(null);
        planProgressRef.current = 0;
      } else {
        const normalised = coerceStudyPlan(data.plan_json ?? data, user.id, {
          startISO: data.start_iso ?? undefined,
          weeks: data.weeks ?? undefined,
          goalBand: data.goal_band ?? undefined,
        });
        setPlan(normalised);
        planProgressRef.current = countCompletedTasks(normalised);
      }
    } catch (err) {
      console.error('Failed to load study plan', err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const todayKey = getDayKeyInTZ();

  const today = useMemo<StudyDay | null>(() => {
    if (!plan) return null;
    return plan.days.find((d) => planDayKey(d) === todayKey) ?? null;
  }, [plan, todayKey]);

  const upcomingDays = useMemo<StudyDay[]>(() => {
    if (!plan) return [];
    return plan.days.filter((d) => planDayKey(d) >= todayKey).slice(0, 7);
  }, [plan, todayKey]);

  const planTotals = useMemo(() => {
    if (!plan) return { total: 0, completed: 0 };
    return plan.days.reduce(
      (acc, day) => {
        acc.total += day.tasks.length;
        acc.completed += day.tasks.filter((task) => task.completed).length;
        return acc;
      },
      { total: 0, completed: 0 },
    );
  }, [plan]);

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
      const { error } = await supabase
        .from('study_plans')
        .upsert(
          {
            user_id: userId,
            plan_json: next as unknown as Record<string, unknown>,
            start_iso: next.startISO,
            weeks: next.weeks,
            goal_band: next.goalBand ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
    },
    [userId],
  );

  const handleCreatePlan = useCallback(
    async (preset: StudyPlanPreset) => {
      if (!userId) {
        toastError(t('studyPlan.toast.signInRequired', 'Please sign in to create a plan.'));
        return;
      }
      setCreatingId(preset.id);
      try {
        const nextPlan = createPlanFromPreset(preset, userId);
        await persistPlan(nextPlan);
        setPlan(nextPlan);
        toastSuccess(
          t('studyPlan.toast.planReady.title', 'Plan ready'),
          t('studyPlan.toast.planReady.description', 'Your new study plan is live. Start with today’s tasks!'),
        );
        track('studyplan_create', { preset: preset.id, weeks: preset.weeks });
        void logStudyPlanEvent('studyplan_create', { preset: preset.id, weeks: preset.weeks });
      } catch (err) {
        console.error('Failed to create plan', err);
        toastError(t('studyPlan.toast.createError', 'Could not create study plan. Please try again.'));
      } finally {
        setCreatingId(null);
      }
    },
    [persistPlan, toastError, toastSuccess, userId, t],
  );

  const handleTaskToggle = useCallback(
    async (day: StudyDay, taskId: string, checked: boolean) => {
      if (!plan || !userId) return;

      const dayKey = planDayKey(day);
      const target = day.tasks.find((t) => t.id === taskId);
      const wasComplete = target?.completed ?? false;
      const hadOtherCompleted = day.tasks.some((t) => t.completed && t.id !== taskId);

      const next: PlanType = {
        ...plan,
        days: plan.days.map((d) =>
          d.dateISO === day.dateISO
            ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, completed: checked } : t)) }
            : d,
        ),
      };

      setBusyTask(taskId);
      setPlan(next);

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
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(t('studyPlan.toast.updateError', 'Could not update task. Please try again.'));
        setPlan(plan); // rollback
        planProgressRef.current = prevCompleted;
      } finally {
        setBusyTask(null);
      }
    },
    [plan, t, userId, persistPlan, completeToday, reloadStreak, toastError, todayKey],
  );

  const hasPlan = !!plan && plan.days.length > 0;

  return (
    <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className={clsx('flex flex-wrap items-center justify-between gap-4', isRTL && 'text-right')}>
          <div>
            <h1 className="font-slab text-display">{t('studyPlan.page.title', 'Your study plan')}</h1>
            <p className="text-body text-muted-foreground">{t('studyPlan.page.subtitle', 'Stay on pace toward your IELTS goal with a daily schedule.')}</p>
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
          {loading ? (
            <Card className="rounded-ds-2xl p-6">
              <div className="space-y-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </Card>
          ) : !hasPlan ? (
            <StudyPlanEmptyState
              presets={PRESETS}
              onSelect={handleCreatePlan}
              busyId={creatingId}
              disabled={!!creatingId}
              showOnboardingCta
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <PlanCard
                  day={today ?? plan!.days[0]}
                  onToggleTask={(taskId, checked) => handleTaskToggle(today ?? plan!.days[0], taskId, checked)}
                  busyTaskId={busyTask}
                  isToday={planDayKey(today ?? plan!.days[0]) === todayKey}
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

                <Card className="rounded-ds-2xl p-6 space-y-4">
                  <h3 className="font-slab text-h4">{t('studyPlan.sidebar.title', 'Need a change?')}</h3>
                  <p className="text-small text-muted-foreground">
                    {t('studyPlan.sidebar.description', 'Plans adapt as you complete tasks. You can always regenerate a fresh schedule from the presets below.')}
                  </p>
                  <div className="space-y-3">
                    {PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        variant="ghost"
                        className="w-full justify-between"
                        onClick={() => handleCreatePlan(preset)}
                        loading={creatingId === preset.id}
                      >
                        {t(preset.titleKey)}
                        <span className="text-small text-muted-foreground">
                          {t('studyPlan.sidebar.weekShort', '{{count}} wk', { count: preset.weeks })}
                        </span>
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
