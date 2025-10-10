// pages/study-plan/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';

import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { generateStudyPlan } from '@/lib/studyPlan';
import { useLocale } from '@/lib/locale';

import type { StudyDay, StudyPlan as PlanType } from '@/types/plan';
import { StudyPlanEmptyState, type StudyPlanPreset } from '@/components/study/EmptyState';
import { PlanCard } from '@/components/study/PlanCard';
import { WeekGrid } from '@/components/study/WeekGrid';
import { StreakChip } from '@/components/user/StreakChip';
import { coerceStudyPlan, planDayKey } from '@/utils/studyPlan';

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

function createPlanFromPreset(preset: StudyPlanPreset, userId: string): PlanType {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const weaknesses =
    preset.id === 'speaking-boost'
      ? ['speaking:fluency', 'writing:task2 coherence']
      : preset.id === 'listening-sprint'
      ? ['listening:maps', 'listening:matching']
      : undefined;

  return generateStudyPlan({
    userId,
    startISO: start.toISOString(),
    weeks: preset.weeks,
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
  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setUserId(null);
        setPlan(null);
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
      } else {
        const normalised = coerceStudyPlan(data.plan_json ?? data, user.id, {
          startISO: data.start_iso ?? undefined,
          weeks: data.weeks ?? undefined,
          goalBand: data.goal_band ?? undefined,
        });
        setPlan(normalised);
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
        toastError(t('studyPlan.toast.signInRequired'));
        return;
      }
      setCreatingId(preset.id);
      try {
        const nextPlan = createPlanFromPreset(preset, userId);
        await persistPlan(nextPlan);
        setPlan(nextPlan);
        toastSuccess(
          t('studyPlan.toast.planReady.title'),
          t('studyPlan.toast.planReady.description'),
        );
      } catch (err) {
        console.error('Failed to create plan', err);
        toastError(t('studyPlan.toast.createError'));
      } finally {
        setCreatingId(null);
      }
    },
    [persistPlan, t, toastError, toastSuccess, userId],
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

      try {
        await persistPlan(next);
        const shouldStartStreak = checked && !wasComplete && !hadOtherCompleted && dayKey === todayKey;
        if (shouldStartStreak) {
          try {
            const data = await completeToday();
            if (!data) await reloadStreak();
          } catch (err) {
            console.error('Streak update failed', err);
          }
        }
        toastSuccess(t('studyPlan.toast.progressSaved'));
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(t('studyPlan.toast.updateError'));
        setPlan(plan); // rollback
      } finally {
        setBusyTask(null);
      }
    },
    [plan, t, userId, persistPlan, completeToday, reloadStreak, toastSuccess, toastError, todayKey],
  );

  const hasPlan = !!plan && plan.days.length > 0;

  return (
    <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className={clsx('flex flex-wrap items-center justify-between gap-4', isRTL && 'text-right')}>
          <div>
            <h1 className="font-slab text-display">{t('studyPlan.page.title')}</h1>
            <p className="text-body text-muted-foreground">{t('studyPlan.page.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <StreakChip value={streakLoading ? 0 : streak} loading={streakLoading} href="/profile/streak" />
            <Button variant="soft" tone="info" asChild>
              <Link href="/progress">{t('studyPlan.page.viewProgress')}</Link>
            </Button>
          </div>
        </div>

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
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                <PlanCard
                  day={today ?? plan!.days[0]}
                  onToggleTask={(taskId, checked) =>
                    handleTaskToggle(today ?? plan!.days[0], taskId, checked)
                  }
                  busyTaskId={busyTask}
                  isToday={planDayKey(today ?? plan!.days[0]) === todayKey}
                />
                <WeekGrid days={upcomingDays} />
              </div>

              <Card className="rounded-ds-2xl p-6 space-y-4">
                <h3 className="font-slab text-h4">{t('studyPlan.sidebar.title')}</h3>
                <p className="text-small text-muted-foreground">{t('studyPlan.sidebar.description')}</p>
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
                        {t('studyPlan.sidebar.weekShort', { count: preset.weeks })}
                      </span>
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}