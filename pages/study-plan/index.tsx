// pages/study-plan.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { useToast } from '@/components/design-system/Toaster';
import { StudyPlanEmptyState, type StudyPlanPreset } from '@/components/study/EmptyState';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  isStudyPlan,
  type StudyDay,
  type StudyPlan,
  type StudyTask,
  type TaskType,
} from '@/types/plan';

const MODULE_SHORTCUTS: ReadonlyArray<{
  type: 'listening' | 'reading' | 'writing' | 'speaking';
  href: string;
  label: string;
}> = [
  { type: 'listening', href: '/listening', label: 'Listening' },
  { type: 'reading', href: '/reading', label: 'Reading' },
  { type: 'writing', href: '/writing', label: 'Writing' },
  { type: 'speaking', href: '/speaking/simulator', label: 'Speaking' },
];

const Shell: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({
  title,
  children,
  right,
}) => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 font-bold">{title}</h1>
        {right}
      </header>
      {/* MAIN landmark here */}
      <main role="main" className="rounded-2xl border border-border bg-background/50 p-5 shadow-sm">
        {children}
      </main>
    </div>
  </div>
);

export default function StudyPlanPage() {
  const toast = useToast();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingPreset, setCreatingPreset] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          if (active) setPlan(null);
          return;
        }

        const { data, error } = await supabase
          .from('study_plans')
          .select('plan_json')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!active) return;

        if (error) throw error;

        const payload = (data as { plan_json?: unknown } | null)?.plan_json;
        if (payload) {
          const normalized = normalizePlan(payload, user.id);
          setPlan(normalized);
        } else {
          setPlan(null);
        }
      } catch (error) {
        if (active) {
          console.error('[study-plan] failed to load plan', error);
          setPlan(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const days = useMemo<StudyDay[]>(() => {
    if (!plan) return [];
    const sorted = [...plan.days].sort(
      (a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime(),
    );
    if (sorted.length === 0) return [];

    const todayKey = new Date().toISOString().slice(0, 10);
    const startIndex = sorted.findIndex((day) => day.dateISO.slice(0, 10) >= todayKey);
    const start = startIndex >= 0 ? startIndex : Math.max(sorted.length - 7, 0);
    return sorted.slice(start, start + 7);
  }, [plan]);

  const showEmpty = !loading && !plan;
  const showCaughtUp = !loading && !!plan && days.length === 0;

  const handleQuickStart = useCallback(
    async (preset: StudyPlanPreset) => {
      setCreatingPreset(preset.id);
      try {
        const res = await fetch('/api/study-plan/quick-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preset: preset.id, weeks: preset.weeks }),
        });
        const json = (await res.json()) as
          | { ok: true; plan: StudyPlan }
          | { ok: false; error: string };

        if (!res.ok || !json?.ok) {
          const message = !res.ok ? res.statusText : json?.error;
          throw new Error(message || 'Failed to create plan');
        }

        setPlan(json.plan);
        toast.success('Study plan ready', `We scheduled a ${preset.weeks}-week track starting today.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create plan';
        toast.error('Could not create plan', message);
      } finally {
        setCreatingPreset(null);
      }
    },
    [toast],
  );

  return (
    <Shell
      title="Your Study Plan"
      right={<Link href="/progress" className="text-small underline decoration-2 underline-offset-4">Progress</Link>}
    >
      {loading ? (
        <div className="rounded-xl border border-border p-4 text-small text-foreground/70" aria-live="polite">
          Loading your plan…
        </div>
      ) : showEmpty ? (
        <StudyPlanEmptyState busyId={creatingPreset} onSelect={handleQuickStart} />
      ) : showCaughtUp ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card/70 p-4 text-small text-muted-foreground">
            You’ve completed every task in this plan. Start a fresh preset to keep your streak climbing.
          </div>
          <StudyPlanEmptyState busyId={creatingPreset} onSelect={handleQuickStart} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => (
            <article key={day.dateISO} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2 text-small font-medium">
                <time dateTime={day.dateISO}>{formatHuman(day.dateISO)}</time>
              </div>
              <ul className="space-y-1 text-small text-foreground/80">
                {day.tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3">
                    <span className="flex-1 text-left">{task.title}</span>
                    <span className="text-foreground/70">{task.estMinutes} min</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {MODULE_SHORTCUTS.filter(({ type }) => day.tasks.some((task) => task.type === type)).map(
                  (module) => (
                    <Link
                      key={module.type}
                      href={module.href}
                      className="rounded-lg border border-border px-3 py-1 text-small transition hover:border-primary"
                    >
                      {module.label}
                    </Link>
                  ),
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </Shell>
  );
}

function formatHuman(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

type LegacyTask = { module: TaskType; minutes: number };
type LegacyDay = { date: string; tasks: LegacyTask[] };
type LegacyPlan = { days?: LegacyDay[] };

function normalizePlan(payload: unknown, userId: string): StudyPlan | null {
  if (isStudyPlan(payload)) return payload;
  if (!isLegacyPlan(payload)) return null;

  const days = payload.days
    .map((legacyDay) => convertLegacyDay(legacyDay))
    .filter(Boolean) as StudyDay[];

  if (days.length === 0) return null;

  const sorted = [...days].sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  const startISO = sorted[0]?.dateISO ?? new Date().toISOString();
  const weeks = Math.max(1, Math.ceil(days.length / 7));

  return {
    userId,
    startISO,
    weeks,
    days,
  } satisfies StudyPlan;
}

function isLegacyPlan(payload: unknown): payload is Required<LegacyPlan> {
  if (!payload || typeof payload !== 'object') return false;
  const maybeDays = (payload as LegacyPlan).days;
  if (!Array.isArray(maybeDays)) return false;
  return maybeDays.every((day) => isLegacyDay(day));
}

function isLegacyDay(day: unknown): day is LegacyDay {
  if (!day || typeof day !== 'object') return false;
  const date = (day as LegacyDay).date;
  const tasks = (day as LegacyDay).tasks;
  if (typeof date !== 'string' || !Array.isArray(tasks)) return false;
  return tasks.every((task) => isLegacyTask(task));
}

function isLegacyTask(task: unknown): task is LegacyTask {
  if (!task || typeof task !== 'object') return false;
  const module = (task as LegacyTask).module;
  const minutes = (task as LegacyTask).minutes;
  return (
    typeof module === 'string' &&
    LEGACY_MODULES.has(module as TaskType) &&
    typeof minutes === 'number' &&
    Number.isFinite(minutes) &&
    minutes > 0
  );
}

const LEGACY_MODULES: ReadonlySet<TaskType> = new Set(['listening', 'reading', 'writing', 'speaking']);

function convertLegacyDay(day: LegacyDay): StudyDay | null {
  const date = ensureISODate(day.date);
  if (!date) return null;

  const tasks: StudyTask[] = day.tasks.map((task, taskIndex) => ({
    id: `${date}::${taskIndex}`,
    type: task.module,
    title: legacyTitleFor(task.module),
    estMinutes: clampMinutes(task.minutes),
    completed: false,
  }));

  if (tasks.length === 0) return null;

  return { dateISO: date, tasks } satisfies StudyDay;
}

function ensureISODate(date: string): string | null {
  if (typeof date !== 'string' || date.length === 0) return null;
  const iso = date.includes('T') ? date : `${date}T00:00:00Z`;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

function legacyTitleFor(module: TaskType): string {
  switch (module) {
    case 'listening':
      return 'Listening practice';
    case 'reading':
      return 'Reading practice';
    case 'writing':
      return 'Writing practice';
    case 'speaking':
      return 'Speaking practice';
    default:
      return 'Study task';
  }
}

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 25;
  return Math.max(5, Math.min(240, Math.round(minutes)));
}
