// pages/study-plan/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';

import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { type AvailabilitySlot, generateStudyPlan } from '@/lib/studyPlan';

import type { StudyDay, StudyPlan as PlanType } from '@/types/plan';
import { StudyPlanEmptyState, type StudyPlanPreset } from '@/components/study/EmptyState';
import { PlanCard } from '@/components/study/PlanCard';
import { WeekGrid } from '@/components/study/WeekGrid';
import { StreakChip } from '@/components/user/StreakChip';
import { coerceStudyPlan, planDayKey } from '@/utils/studyPlan';

const PRESETS: ReadonlyArray<StudyPlanPreset> = [
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
    description: 'Two-week plan focused on speaking drills and writing prompts.',
    weeks: 2,
  },
  {
    id: 'listening-sprint',
    title: 'Listening sprint',
    description: 'One-week reset with intensive listening practice.',
    weeks: 1,
    highlight: 'Great for jump-starts',
  },
];

const PRESET_TARGETS: Record<string, number> = {
  'balanced-4w': 7,
  'speaking-boost': 6.5,
  'listening-sprint': 6,
};

const PRESET_AVAILABILITY: Record<string, AvailabilitySlot[]> = {
  'balanced-4w': [
    { day: 'monday', minutes: 60 },
    { day: 'tuesday', minutes: 45 },
    { day: 'thursday', minutes: 55 },
    { day: 'friday', minutes: 45 },
    { day: 'saturday', minutes: 70 },
  ],
  'speaking-boost': [
    { day: 'monday', minutes: 50 },
    { day: 'wednesday', minutes: 45 },
    { day: 'friday', minutes: 55 },
    { day: 'saturday', minutes: 60 },
  ],
  'listening-sprint': [
    { day: 'monday', minutes: 60 },
    { day: 'tuesday', minutes: 50 },
    { day: 'thursday', minutes: 55 },
    { day: 'friday', minutes: 50 },
    { day: 'saturday', minutes: 80 },
  ],
};

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

  const planProgressRef = useRef<number>(0);

  const { success: toastSuccess, error: toastError } = useToast();
  const { current: streak, loading: streakLoading, completeToday, reload: reloadStreak } = useStreak();

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
        toastError('Please sign in to create a study plan.');
        return;
      }
      setCreatingId(preset.id);
      try {
        const nextPlan = createPlanFromPreset(preset, userId);
        await persistPlan(nextPlan);
        setPlan(nextPlan);
        toastSuccess('Plan ready', 'Your new study plan is live. Start with today’s tasks!');
        const prevWeeks = plan?.weeks ?? 0;
        const deltaWeeks = nextPlan.weeks - prevWeeks;
        const completed = countCompletedTasks(nextPlan);
        planProgressRef.current = completed;
        void emitUserEvent('studyplan_create', {
          step: nextPlan.weeks,
          delta: deltaWeeks,
          tasksCompleted: completed,
        });
      } catch (err) {
        console.error('Failed to create plan', err);
        toastError(err instanceof Error ? err.message : 'Could not create plan.');
      } finally {
        setCreatingId(null);
      }
    },
    [persistPlan, toastError, toastSuccess, userId, plan],
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
        const nextCompleted = countCompletedTasks(next);
        planProgressRef.current = nextCompleted;
        void emitUserEvent('studyplan_update', {
          step: nextCompleted,
          delta: nextCompleted - prevCompleted,
          day: planDayKey(day),
          taskId,
          completed: checked,
        });
        const shouldStartStreak = checked && !wasComplete && !hadOtherCompleted && dayKey === todayKey;
        if (shouldStartStreak) {
          try {
            const data = await completeToday();
            if (!data) await reloadStreak();
          } catch (err) {
            console.error('Streak update failed', err);
          }
        }
        toastSuccess('Progress saved');
      } catch (err) {
        console.error('Failed to update task', err);
        toastError(err instanceof Error ? err.message : 'Could not update task.');
        setPlan(plan); // rollback
        planProgressRef.current = prevCompleted;
      } finally {
        setBusyTask(null);
      }
    },
    [plan, userId, persistPlan, completeToday, reloadStreak, toastSuccess, toastError, todayKey],
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
                      loading={creatingId === preset.id}
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