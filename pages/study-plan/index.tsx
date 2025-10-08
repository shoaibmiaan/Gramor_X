'use client';

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
import type { StudyDay, StudyPlan as PlanType } from '@/types/plan';
import { StudyPlanEmptyState, type PlanPreset } from '@/components/study/EmptyState';
import { PlanCard } from '@/components/study/PlanCard';
import { WeekGrid } from '@/components/study/WeekGrid';
import { StreakChip } from '@/components/user/StreakChip';
import { coerceStudyPlan, planDayKey } from '@/utils/studyPlan';

const PRESETS: PlanPreset[] = [
  {
    id: 'balanced-4w',
    title: 'Balanced focus',
    description: 'Four weeks of daily IELTS tasks evenly split across all skills.',
    weeks: 4,
    highlight: 'Recommended',
  },
  {
    id: 'speaking-boost',
    title: 'Speaking boost',
    description: 'Two-week plan that doubles down on speaking drills and writing prompts.',
    weeks: 2,
  },
  {
    id: 'listening-sprint',
    title: 'Listening sprint',
    description: 'One-week reset with focused listening practice and quick reviews.',
    weeks: 1,
    highlight: 'Great for jump-starts',
  },
];

function createPlanFromPreset(preset: PlanPreset, userId: string): PlanType {
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
  const [creating, setCreating] = useState<string | null>(null);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        setUserId(null);
        setPlan(null);
        setLoading(false);
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

  const upcomingDays = useMemo(() => {
    if (!plan) return [];
    const todayKey = getDayKeyInTZ();
    return plan.days
      .filter((day) => planDayKey(day) >= todayKey)
      .slice(0, 7);
  }, [plan]);

  const today = useMemo(() => {
    if (!plan) return null;
    const todayKey = getDayKeyInTZ();
    return plan.days.find((day) => planDayKey(day) === todayKey) ?? null;
  }, [plan]);

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
    async (preset: PlanPreset) => {
      if (!userId) {
        toastError('Please sign in to create a study plan.');
        return;
      }
      setCreating(preset.id);
      try {
        const nextPlan = createPlanFromPreset(preset, userId);
        await persistPlan(nextPlan);
        setPlan(nextPlan);
        toastSuccess('Plan ready', 'Your new study plan is live. Start with today’s tasks!');
      } catch (err) {
        console.error('Failed to create plan', err);
        toastError(err instanceof Error ? err.message : 'Could not create plan.');
      } finally {
        setCreating(null);
      }
    },
    [persistPlan, toastError, toastSuccess, userId],
  );

  const handleTaskToggle = useCallback(
    async (day: StudyDay, taskId: string, checked: boolean) => {
      if (!plan || !userId) return;
      const dayKey = planDayKey(day);
      const todayKey = getDayKeyInTZ();
      const target = day.tasks.find((task) => task.id === taskId);
      const wasComplete = target?.completed ?? false;
      const hadOtherCompleted = day.tasks.some((task) => task.completed && task.id !== taskId);
      const nextPlan: PlanType = {
        ...plan,
        days: plan.days.map((existing) =>
          existing.dateISO === day.dateISO
            ? {
                ...existing,
                tasks: existing.tasks.map((task) =>
                  task.id === taskId ? { ...task, completed: checked } : task,
                ),
              }
            : existing,
        ),
      };

      setUpdatingTask(taskId);
      setPlan(nextPlan);

      try {
        await persistPlan(nextPlan);
        const shouldStartStreak =
          checked && !wasComplete && !hadOtherCompleted && dayKey === todayKey;
        if (shouldStartStreak) {
          try {
            const data = await completeToday();
            if (data?.current_streak != null) {
              window.dispatchEvent(
                new CustomEvent('streak:changed', { detail: { value: data.current_streak } }),
              );
            } else {
              await reloadStreak();
            }
          } catch (err) {
            console.error('Failed to update streak', err);
          }
        }
        toastSuccess('Progress saved');
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(err instanceof Error ? err.message : 'Could not update task.');
        setPlan(plan);
      } finally {
        setUpdatingTask(null);
      }
    },
    [plan, userId, persistPlan, completeToday, reloadStreak, toastSuccess, toastError],
  );

  const hasPlan = !!plan && plan.days.length > 0;

  return (
    <section className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-slab text-display">Your study plan</h1>
            <p className="text-body text-muted-foreground">
              Keep a daily rhythm to build momentum for your IELTS goal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StreakChip value={streakLoading ? 0 : streak} loading={streakLoading} href="/profile/streak" />
            <Button variant="soft" tone="info" asChild>
              <Link href="/progress">View progress</Link>
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
            <StudyPlanEmptyState presets={PRESETS} onSelect={handleCreatePlan} loadingId={creating} disabled={!!creating} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                <PlanCard
                  day={today ?? plan.days[0]}
                  onToggleTask={(taskId, checked) => handleTaskToggle(today ?? plan.days[0], taskId, checked)}
                  busyTaskId={updatingTask}
                  isToday={planDayKey(today ?? plan.days[0]) === getDayKeyInTZ()}
                />
                <WeekGrid days={upcomingDays} />
              </div>
              <Card className="rounded-ds-2xl p-6 space-y-4">
                <h3 className="font-slab text-h4">Need a change?</h3>
                <p className="text-small text-muted-foreground">
                  Plans adapt as you complete tasks. You can always regenerate a fresh schedule from the presets
                  below.
                </p>
                <div className="space-y-3">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => handleCreatePlan(preset)}
                      loading={creating === preset.id}
                    >
                      {preset.title}
                      <span className="text-small text-muted-foreground">{preset.weeks} wk</span>
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
