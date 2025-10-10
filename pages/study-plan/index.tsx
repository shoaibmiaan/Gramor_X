// pages/study-plan/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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

const PRESET_CONFIG: ReadonlyArray<{
  id: string;
  weeks: number;
  titleKey: string;
  descriptionKey: string;
  highlightKey?: string;
}> = [
  {
    id: 'balanced-4w',
    weeks: 4,
    titleKey: 'studyPlan.presets.balanced.title',
    descriptionKey: 'studyPlan.presets.balanced.description',
    highlightKey: 'studyPlan.presets.balanced.highlight',
  },
  {
    id: 'speaking-boost',
    weeks: 2,
    titleKey: 'studyPlan.presets.speaking.title',
    descriptionKey: 'studyPlan.presets.speaking.description',
  },
  {
    id: 'listening-sprint',
    weeks: 1,
    titleKey: 'studyPlan.presets.listening.title',
    descriptionKey: 'studyPlan.presets.listening.description',
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
  const { t, locale } = useLocale();
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();

  const presets = useMemo<ReadonlyArray<StudyPlanPreset>>(
    () =>
      PRESET_CONFIG.map((preset) => ({
        id: preset.id,
        weeks: preset.weeks,
        title: t(preset.titleKey),
        description: t(preset.descriptionKey),
        highlight: preset.highlightKey ? t(preset.highlightKey) : undefined,
      })),
    [locale, t],
  );

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
        toastError(t('studyPlan.toasts.authRequired'));
        return;
      }
      setCreatingId(preset.id);
      try {
        const nextPlan = createPlanFromPreset(preset, userId);
        await persistPlan(nextPlan);
        setPlan(nextPlan);
        toastSuccess(
          t('studyPlan.toasts.planReady.title'),
          t('studyPlan.toasts.planReady.description'),
        );
      } catch (err) {
        console.error('Failed to create plan', err);
        toastError(t('studyPlan.toasts.createFailure'));
      } finally {
        setCreatingId(null);
      }
    },
    [persistPlan, toastError, toastSuccess, t, userId],
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
        toastSuccess(t('studyPlan.toasts.progressSaved'));
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(t('studyPlan.toasts.updateFailure'));
        setPlan(plan); // rollback
      } finally {
        setBusyTask(null);
      }
    },
    [plan, userId, persistPlan, completeToday, reloadStreak, toastSuccess, toastError, t, todayKey],
  );

  const hasPlan = !!plan && plan.days.length > 0;

  return (
    <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-slab text-display">{t('studyPlan.hero.title')}</h1>
            <p className="text-body text-muted-foreground">{t('studyPlan.hero.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <StreakChip value={streakLoading ? 0 : streak} loading={streakLoading} href="/profile/streak" />
            <Button variant="soft" tone="info" asChild>
              <Link href="/progress">{t('studyPlan.hero.viewProgress')}</Link>
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
              presets={presets}
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
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => handleCreatePlan(preset)}
                      loading={creatingId === preset.id}
                    >
                      {preset.title}
                      <span className="text-small text-muted-foreground">
                        {t('studyPlan.sidebar.weeksShort', undefined, { count: preset.weeks })}
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