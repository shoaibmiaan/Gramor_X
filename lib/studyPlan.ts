// lib/studyPlan.ts
import { z } from 'zod';

import { StudyPlan, StudyDay, StudyTask, TaskType } from '@/types/plan';

import { env } from './env';

const MS_PER_DAY = 86_400_000;

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

type Weekday = (typeof WEEKDAY_NAMES)[number];

const CORE_SKILLS: TaskType[] = ['listening', 'reading', 'writing', 'speaking'];

const BASE_FOCUS_MINUTES: Record<(typeof CORE_SKILLS)[number], number> = {
  listening: 35,
  reading: 40,
  writing: 45,
  speaking: 30,
};

const SUPPORT_MINUTES: Record<(typeof CORE_SKILLS)[number], number> = {
  listening: 25,
  reading: 30,
  writing: 35,
  speaking: 25,
};

const MIN_PRACTICE_ON_MOCK_DAY = 25;

const AvailabilitySlotSchema = z
  .object({
    day: z.enum(WEEKDAY_NAMES),
    minutes: z.number().int().min(15).max(240),
  })
  .strict();

export type AvailabilitySlot = z.infer<typeof AvailabilitySlotSchema>;

const isoLike = z
  .string()
  .min(4)
  .refine((value) => !Number.isNaN(new Date(value).valueOf()), 'invalid_date');

export const PlanGenOptionsSchema = z
  .object({
    userId: z.string().min(1),
    startISO: isoLike.optional(),
    examDateISO: isoLike,
    targetBand: z.number().min(4).max(9),
    availability: z
      .array(AvailabilitySlotSchema)
      .min(1)
      .refine(
        (slots) => {
          const seen = new Set<Weekday>();
          for (const slot of slots) {
            if (seen.has(slot.day)) return false;
            seen.add(slot.day);
          }
          return true;
        },
        { message: 'duplicate_day' },
      ),
    weaknesses: z.array(z.string().min(1)).max(16).optional(),
  })
  .strict();

export type PlanGenOptions = z.infer<typeof PlanGenOptionsSchema>;

type ParsedOptions = Omit<PlanGenOptions, 'startISO' | 'examDateISO'> & {
  start: Date;
  exam: Date;
};

type DayBlueprint = {
  iso: string;
  weekIndex: number;
  dayIndex: number;
  minutes: number;
  weekday: Weekday;
};

function normaliseToUTC(input: string | undefined, fallback: Date): Date {
  if (!input) return truncateToUTC(fallback);
  return truncateToUTC(new Date(input));
}

function truncateToUTC(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToFive(value: number): number {
  if (value <= 0) return 0;
  return Math.max(5, Math.round(value / 5) * 5);
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function createTask(
  dayIndex: number,
  tasks: StudyTask[],
  partial: Partial<StudyTask> & Pick<StudyTask, 'type' | 'title'>,
): StudyTask {
  const estMinutes = partial.estMinutes ?? defaultMinutes(partial.type);
  const task: StudyTask = {
    id: `task-${dayIndex}-${tasks.length}`,
    estMinutes,
    completed: false,
    ...partial,
    estMinutes,
  } as StudyTask;
  return task;
}

function defaultMinutes(type: TaskType): number {
  switch (type) {
    case 'mock':
      return 60;
    case 'review':
      return 20;
    case 'writing':
      return 40;
    case 'speaking':
      return 30;
    case 'vocab':
      return 15;
    default:
      return 30;
  }
}

function computeIntensity(targetBand: number): number {
  // Around band 6 => neutral. Above => slightly more volume, below => gentler pace.
  const delta = targetBand - 6;
  return clamp(1 + delta * 0.15, 0.85, 1.35);
}

type BuildDayOptions = {
  dayIndex: number;
  weekNumber: number;
  availableMinutes: number;
  focus: (typeof CORE_SKILLS)[number];
  support: (typeof CORE_SKILLS)[number];
  includeMock: boolean;
  targetBand: number;
  intensity: number;
  weakness?: string;
};

function buildDayTasks({
  dayIndex,
  weekNumber,
  availableMinutes,
  focus,
  support,
  includeMock,
  targetBand,
  intensity,
  weakness,
}: BuildDayOptions): StudyTask[] {
  const tasks: StudyTask[] = [];

  if (availableMinutes <= 0) return tasks;

  let reservedForMock = 0;
  if (includeMock) {
    const desiredMock = clamp(roundToFive(Math.round(70 * intensity)), 45, 90);
    const maxAllowable = Math.max(0, availableMinutes - MIN_PRACTICE_ON_MOCK_DAY);
    if (maxAllowable <= 0) {
      reservedForMock = Math.min(desiredMock, availableMinutes);
    } else {
      reservedForMock = Math.min(desiredMock, maxAllowable);
      if (reservedForMock < 45 && maxAllowable >= 45) reservedForMock = 45;
      if (reservedForMock < 30) reservedForMock = Math.min(maxAllowable, 30);
    }
  }

  let practiceBudget = Math.max(0, availableMinutes - reservedForMock);

  if (includeMock && practiceBudget < MIN_PRACTICE_ON_MOCK_DAY && availableMinutes >= MIN_PRACTICE_ON_MOCK_DAY) {
    const diff = MIN_PRACTICE_ON_MOCK_DAY - practiceBudget;
    if (reservedForMock > diff) {
      reservedForMock -= diff;
      practiceBudget += diff;
    }
  }

  const focusDesired = roundToFive(Math.round(BASE_FOCUS_MINUTES[focus] * intensity));
  const focusMinutes = roundToFive(
    clamp(focusDesired, Math.min(20, practiceBudget), Math.max(practiceBudget, 0)),
  );

  if (focusMinutes > 0 && practiceBudget > 0) {
    tasks.push(
      createTask(dayIndex, tasks, {
        type: focus,
        title: `${capitalize(focus)} focus – Band ${targetBand.toFixed(1)} goal`,
        estMinutes: Math.min(focusMinutes, practiceBudget),
      }),
    );
  }

  let used = tasks.reduce((total, item) => total + item.estMinutes, 0);
  let remainingPractice = Math.max(practiceBudget - used, 0);

  if (remainingPractice >= 20) {
    const supportDesired = roundToFive(Math.round(SUPPORT_MINUTES[support] * intensity));
    const supportMinutes = roundToFive(clamp(supportDesired, 20, remainingPractice));
    if (supportMinutes > 0) {
      tasks.push(
        createTask(dayIndex, tasks, {
          type: support,
          title: `Secondary drill: ${capitalize(support)}`,
          estMinutes: Math.min(supportMinutes, remainingPractice),
        }),
      );
      used = tasks.reduce((total, item) => total + item.estMinutes, 0);
      remainingPractice = Math.max(practiceBudget - used, 0);
    }
  }

  if (remainingPractice >= 15) {
    const reviewMinutes = roundToFive(Math.min(remainingPractice, 20));
    tasks.push(
      createTask(dayIndex, tasks, {
        type: 'review',
        title: weakness ? `Targeted review: ${weakness}` : 'Error review + note check',
        estMinutes: reviewMinutes,
      }),
    );
    used = tasks.reduce((total, item) => total + item.estMinutes, 0);
    remainingPractice = Math.max(practiceBudget - used, 0);
  }

  if (remainingPractice >= 10) {
    const vocabMinutes = roundToFive(Math.min(remainingPractice, 15));
    if (vocabMinutes > 0) {
      tasks.push(
        createTask(dayIndex, tasks, {
          type: 'vocab',
          title: 'Vocabulary refresh',
          estMinutes: vocabMinutes,
        }),
      );
      used = tasks.reduce((total, item) => total + item.estMinutes, 0);
      remainingPractice = Math.max(practiceBudget - used, 0);
    }
  }

  if (includeMock && reservedForMock > 0) {
    const mockAvailable = Math.max(availableMinutes - used, 0);
    const mockMinutes = roundToFive(Math.min(reservedForMock, mockAvailable));
    if (mockMinutes > 0) {
      tasks.push(
        createTask(dayIndex, tasks, {
          type: 'mock',
          title: `Weekly mock checkpoint (Week ${weekNumber})`,
          estMinutes: mockMinutes,
        }),
      );
    }
  }

  return tasks;
}

function computeBlueprints(opts: ParsedOptions): DayBlueprint[] {
  const availabilityMap = new Map<Weekday, number>();
  for (const slot of opts.availability) {
    availabilityMap.set(slot.day, slot.minutes);
  }

  const days: DayBlueprint[] = [];
  const totalDays = Math.max(
    1,
    Math.floor((opts.exam.getTime() - opts.start.getTime()) / MS_PER_DAY) + 1,
  );

  for (let offset = 0; offset < totalDays; offset += 1) {
    const date = addDays(opts.start, offset);
    const iso = date.toISOString();
    const weekday = WEEKDAY_NAMES[date.getUTCDay()];
    const minutes = availabilityMap.get(weekday) ?? 0;
    days.push({
      iso,
      weekIndex: Math.floor(offset / 7),
      dayIndex: offset,
      minutes,
      weekday,
    });
  }

  return days;
}

function determineMockTargets(blueprints: DayBlueprint[]): Set<string> {
  const mockDays = new Set<string>();
  const weekToCandidate = new Map<number, DayBlueprint>();

  for (const blueprint of blueprints) {
    if (blueprint.minutes <= 0) continue;
    weekToCandidate.set(blueprint.weekIndex, blueprint);
  }

  for (const candidate of weekToCandidate.values()) {
    mockDays.add(candidate.iso);
  }

  return mockDays;
}

export function generateStudyPlan(raw: PlanGenOptions): StudyPlan {
  const parsed = PlanGenOptionsSchema.parse(raw);

  const start = normaliseToUTC(parsed.startISO, new Date());
  const exam = truncateToUTC(new Date(parsed.examDateISO));
  const safeExam = exam.getTime() < start.getTime() ? start : exam;

  const opts: ParsedOptions = {
    ...parsed,
    start,
    exam: safeExam,
  };

  const blueprints = computeBlueprints(opts);
  const mockTargets = determineMockTargets(blueprints);
  const intensity = computeIntensity(parsed.targetBand);

  const days: StudyDay[] = [];
  let focusIndex = 0;

  for (const blueprint of blueprints) {
    if (blueprint.minutes <= 0) {
      days.push({ dateISO: blueprint.iso, tasks: [] });
      continue;
    }

    const focus = CORE_SKILLS[focusIndex % CORE_SKILLS.length];
    const support = CORE_SKILLS[(focusIndex + 1) % CORE_SKILLS.length];
    const weakness = parsed.weaknesses?.length
      ? parsed.weaknesses[focusIndex % parsed.weaknesses.length]
      : undefined;

    const tasks = buildDayTasks({
      dayIndex: blueprint.dayIndex,
      weekNumber: blueprint.weekIndex + 1,
      availableMinutes: blueprint.minutes,
      focus,
      support,
      includeMock: mockTargets.has(blueprint.iso),
      targetBand: parsed.targetBand,
      intensity,
      weakness,
    });

    days.push({ dateISO: blueprint.iso, tasks });
    focusIndex += 1;
  }

  const totalDays = days.length;
  const weeks = clamp(Math.ceil(totalDays / 7), 1, 12);

  return {
    userId: parsed.userId,
    startISO: opts.start.toISOString(),
    weeks,
    goalBand: parsed.targetBand,
    weaknesses: parsed.weaknesses?.length ? parsed.weaknesses : undefined,
    days,
  };
}

/** Mark task done (in-memory helper; persist separately). */
export function markTaskComplete(sp: StudyPlan, dateISO: string, taskId: string): StudyPlan {
  const days = sp.days.map((d) =>
    d.dateISO.slice(0, 10) === dateISO.slice(0, 10)
      ? { ...d, tasks: d.tasks.map((t) => (t.id === taskId ? { ...t, completed: true } : t)) }
      : d,
  );
  return { ...sp, days };
}

/** Persist via API (preferred). Falls back to direct Supabase if API unavailable. */
export async function upsertStudyPlan(sp: StudyPlan): Promise<{ ok: true } | { ok: false; error: string }> {
  const base =
    typeof window === 'undefined'
      ? env.SITE_URL || env.NEXT_PUBLIC_BASE_URL || ''
      : '';

  try {
    // Use onboarding complete endpoint if present (it persists profile + plan)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const { supabaseBrowser } = await import('@/lib/supabaseBrowser');
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* no-op */ }

    const r = await fetch(`${base}/api/onboarding/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan_json: sp }),
    });

    if (r.ok) return { ok: true };
  } catch {
    // fall through
  }

  // Fallback: write directly
  try {
    const { supabaseBrowser } = await import('@/lib/supabaseBrowser');
    const sb = supabaseBrowser;
    const { error } = await sb.from('study_plans').upsert(
      {
        user_id: sp.userId,
        plan_json: sp,
        start_iso: sp.startISO,
        weeks: sp.weeks,
        goal_band: sp.goalBand,
      },
      { onConflict: 'user_id' },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'persist_failed' };
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
