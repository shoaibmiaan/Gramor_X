import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { generateStudyPlan } from '@/lib/studyPlan';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import type { OnboardingState } from '@/lib/onboarding/schema';
import type { PlanGenOptions, AvailabilitySlot } from '@/lib/studyPlan';
import type { StudyPlan } from '@/types/plan';

type GenerationStatus = 'generating' | 'ready' | 'saving' | 'error';

const DAY_MAP: Record<string, AvailabilitySlot['day']> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
};

const DAY_LABELS: Record<AvailabilitySlot['day'], string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const DEFAULT_DAYS: AvailabilitySlot['day'][] = ['monday', 'wednesday', 'friday', 'sunday'];

function addDaysISO(days: number): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

function buildPlanOptions(userId: string, state: OnboardingState): PlanGenOptions {
  const targetBand = state.goalBand ?? 7;
  const minutes = state.studyMinutesPerDay ?? 45;
  const selectedDays =
    state.studyDays?.map((d) => DAY_MAP[d]).filter(Boolean) ?? DEFAULT_DAYS;

  const availability = selectedDays.map((day) => ({
    day,
    minutes,
  }));

  return {
    userId,
    targetBand,
    startISO: new Date().toISOString(),
    examDateISO: state.examDate ? new Date(state.examDate).toISOString() : addDaysISO(28),
    availability,
    weaknesses: state.weaknesses ?? undefined,
    currentLevel: state.currentLevel ?? undefined,
    previousIelts: state.previousIelts ?? undefined,
    confidence: state.confidence ?? undefined,
    diagnostic: state.diagnostic ?? undefined,
    minutesPerDay: state.studyMinutesPerDay ?? minutes,
    daysPerWeek: selectedDays.length,
  };
}

const OnboardingStudyPlanPage: NextPage = () => {
  const router = useRouter();

  const [status, setStatus] = useState<GenerationStatus>('generating');
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [estimatedBand, setEstimatedBand] = useState<number | null>(null);

  const nextPath = '/onboarding/notifications';

  const generatePlan = useCallback(async () => {
    setStatus('generating');
    setError(null);

    const startedAt = Date.now();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setStatus('error');
        setError('Please sign in again to generate your plan.');
        return;
      }

      const onboardingRes = await fetch('/api/onboarding');
      if (!onboardingRes.ok) {
        setStatus('error');
        setError('Could not read your onboarding preferences.');
        return;
      }

      const onboardingState = (await onboardingRes.json()) as OnboardingState;
      const options = buildPlanOptions(user.id, onboardingState);
      const generatedPlan = generateStudyPlan(options);
      setEstimatedBand(onboardingState.diagnostic?.estimated_band ?? null);

      const elapsed = Date.now() - startedAt;
      if (elapsed < 1500) {
        await new Promise((resolve) => setTimeout(resolve, 1500 - elapsed));
      }

      setAvailability(options.availability);
      setPlan(generatedPlan);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to generate onboarding study plan', err);
      setStatus('error');
      setError('Something went wrong while generating your study plan.');
    }
  }, []);

  useEffect(() => {
    void generatePlan();
  }, [generatePlan]);

  const handleContinue = useCallback(async () => {
    if (!plan) return;

    try {
      setStatus('saving');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setStatus('error');
        setError('Please sign in again to save your plan.');
        return;
      }

      const { error: saveError } = await supabase.from('study_plans').upsert(
        {
          user_id: user.id,
          plan_json: plan as unknown as Record<string, unknown>,
          start_iso: plan.startISO,
          weeks: plan.weeks,
          goal_band: plan.goalBand ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

      if (saveError) {
        setStatus('error');
        setError('Could not save your study plan. Please try again.');
        return;
      }

      await router.replace(nextPath);
    } catch (err) {
      console.error('Failed to save onboarding study plan', err);
      setStatus('error');
      setError('Could not save your study plan. Please try again.');
    }
  }, [nextPath, plan, router]);

  const firstThreeDays = plan?.days.slice(0, 3) ?? [];

  return (
    <main className="min-h-screen bg-background">
      <Container className="flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-3xl space-y-6 p-6 sm:p-8" insetBorder>
          {(status === 'generating' || status === 'saving') && (
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Buddy AI is working
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {status === 'generating'
                  ? 'Generating your personalized study plan…'
                  : 'Saving your study plan…'}
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                We are combining your exam timeline, target band, and preferred study rhythm.
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          )}

          {status === 'ready' && plan && (
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Your Buddy AI draft is ready
                </p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Review your generated study plan
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Confirm this plan to continue, or regenerate if you want a different balance.
                </p>
                {typeof estimatedBand === 'number' && (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
                    Estimated current band from diagnostic: <span className="font-semibold">{estimatedBand.toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 rounded-2xl border border-border bg-card/60 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground">Target band</p>
                  <p className="font-semibold">{plan.goalBand?.toFixed(1) ?? '7.0'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Study days</p>
                  <p className="font-semibold">{availability.map((slot) => DAY_LABELS[slot.day]).join(', ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan duration</p>
                  <p className="font-semibold">{plan.weeks} weeks</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">First sessions</p>
                {firstThreeDays.map((day) => (
                  <div key={day.iso} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-medium">{new Date(day.iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                      {day.tasks.slice(0, 2).map((task) => (
                        <li key={task.id}>
                          {task.title} · {task.estMinutes} mins
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleContinue}>Continue to notifications</Button>
                <Button variant="secondary" onClick={() => void generatePlan()}>
                  Regenerate plan
                </Button>
                <Button variant="ghost" onClick={() => void router.push('/profile/setup')}>
                  Change onboarding details
                </Button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold tracking-tight">We couldn’t finish your study plan</h1>
              <p className="text-sm text-destructive">{error ?? 'Please try again.'}</p>
              <div className="flex gap-3">
                <Button onClick={() => void generatePlan()}>Try again</Button>
                <Button variant="ghost" onClick={() => void router.push('/dashboard')}>
                  Go to dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>
      </Container>
    </main>
  );
};

export default OnboardingStudyPlanPage;
