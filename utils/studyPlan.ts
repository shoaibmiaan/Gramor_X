import { isStudyPlan, type StudyDay, type StudyPlan, type StudyTask, type TaskType } from '@/types/plan';

type RawPlan = unknown;

const KNOWN_TYPES: TaskType[] = [
  'listening',
  'reading',
  'writing',
  'speaking',
  'vocab',
  'review',
  'mock',
  'rest',
];

const DEFAULT_TITLES: Record<TaskType, string> = {
  listening: 'Listening practice',
  reading: 'Reading drill',
  writing: 'Writing practice',
  speaking: 'Speaking prompts',
  vocab: 'Vocabulary builder',
  review: 'Review session',
  mock: 'Mock test',
  rest: 'Rest and recharge',
};

const DEFAULT_MINUTES: Record<TaskType, number> = {
  listening: 25,
  reading: 25,
  writing: 40,
  speaking: 20,
  vocab: 15,
  review: 20,
  mock: 60,
  rest: 0,
};

const MS_PER_DAY = 86_400_000;

function safeRandomId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toTaskType(value: unknown, fallback: TaskType = 'review'): TaskType {
  const str = typeof value === 'string' ? value.toLowerCase() : '';
  if (KNOWN_TYPES.includes(str as TaskType)) return str as TaskType;
  return fallback;
}

function ensureISODate(input?: string | null): string {
  if (!input) {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    return now.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return new Date(`${input}T00:00:00.000Z`).toISOString();
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    parsed.setUTCHours(0, 0, 0, 0);
    return parsed.toISOString();
  }

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function normaliseTask(task: any, dateISO: string, index: number): StudyTask {
  if (task && typeof task === 'object' && 'type' in task && 'title' in task) {
    const type = toTaskType((task as any).type, 'review');
    const estMinutes =
      typeof (task as any).estMinutes === 'number'
        ? (task as any).estMinutes
        : typeof (task as any).minutes === 'number'
        ? (task as any).minutes
        : DEFAULT_MINUTES[type];

    return {
      id: typeof (task as any).id === 'string' ? (task as any).id : safeRandomId(`${dateISO}-${index}`),
      type,
      title: String((task as any).title || DEFAULT_TITLES[type]),
      estMinutes,
      resourceId: typeof (task as any).resourceId === 'string' ? (task as any).resourceId : undefined,
      dueISO: typeof (task as any).dueISO === 'string' ? (task as any).dueISO : undefined,
      completed: Boolean((task as any).completed),
    } as StudyTask;
  }

  if (task && typeof task === 'object' && 'module' in task) {
    const type = toTaskType((task as any).module, 'review');
    const minutes = typeof (task as any).minutes === 'number' ? (task as any).minutes : DEFAULT_MINUTES[type];
    return {
      id: safeRandomId(`${dateISO}-${index}`),
      type,
      title: DEFAULT_TITLES[type],
      estMinutes: minutes,
      completed: Boolean((task as any).completed),
    } as StudyTask;
  }

  return {
    id: safeRandomId(`${dateISO}-${index}`),
    type: 'review',
    title: DEFAULT_TITLES.review,
    estMinutes: DEFAULT_MINUTES.review,
    completed: false,
  } as StudyTask;
}

function normaliseDay(day: any, index: number): StudyDay {
  const dateISO = ensureISODate((day as any)?.dateISO ?? (day as any)?.date);
  const tasksArray = Array.isArray((day as any)?.tasks) ? (day as any).tasks : [];
  return {
    dateISO,
    tasks: tasksArray.map((task: any, idx: number) => normaliseTask(task, dateISO, idx + index * 10)),
  } as StudyDay;
}

export function coerceStudyPlan(raw: RawPlan, userId: string, overrides: Partial<Omit<StudyPlan, 'userId' | 'days'>> = {}): StudyPlan | null {
  if (!raw) return null;

  let payload: any = raw;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }

  if (payload && typeof payload === 'object' && 'plan_json' in payload) {
    return coerceStudyPlan((payload as any).plan_json, userId, overrides);
  }

  if (isStudyPlan(payload)) {
    const days = Array.isArray(payload.days) ? payload.days.map((day, idx) => normaliseDay(day, idx)) : [];
    return {
      ...payload,
      ...overrides,
      userId,
      days,
    } satisfies StudyPlan;
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as any).days)) {
    const baseDays = (payload as any).days.map((day: any, idx: number) => normaliseDay(day, idx));
    const first = baseDays[0]?.dateISO;
    const startISO = ensureISODate((payload as any).startISO ?? (payload as any).start_iso ?? (payload as any).start_date ?? first);
    const weeks =
      overrides.weeks ??
      (typeof (payload as any).weeks === 'number'
        ? (payload as any).weeks
        : Math.max(1, Math.ceil(baseDays.length / 7)));

    return {
      userId,
      startISO,
      weeks,
      goalBand:
        overrides.goalBand ??
        (typeof (payload as any).goalBand === 'number'
          ? (payload as any).goalBand
          : typeof (payload as any).goal_band === 'number'
          ? (payload as any).goal_band
          : undefined),
      weaknesses: overrides.weaknesses ?? ((payload as any).weaknesses ?? []),
      days: baseDays,
    } satisfies StudyPlan;
  }

  return null;
}

export function planDayKey(day: StudyDay): string {
  return day.dateISO.slice(0, 10);
}

export function totalMinutesForDay(day: StudyDay): number {
  return day.tasks.reduce((sum, task) => sum + (task.estMinutes ?? 0), 0);
}

export function buildCompletionHistory(
  plan: StudyPlan | null,
  daysBack = 84,
  timeZone = 'Asia/Karachi',
): { date: string; completed: number; total: number }[] {
  const history: { date: string; completed: number; total: number }[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (daysBack - 1) * MS_PER_DAY);

  const dayMap = new Map<string, StudyDay>();
  if (plan) {
    for (const day of plan.days) {
      dayMap.set(planDayKey(day), day);
    }
  }

  for (let i = 0; i < daysBack; i++) {
    const current = new Date(start.getTime() + i * MS_PER_DAY);
    const key = formatDateKey(current, timeZone);
    const match = dayMap.get(key);
    const total = match ? match.tasks.length : 0;
    const completed = match ? match.tasks.filter((task) => task.completed).length : 0;
    history.push({ date: key, total, completed });
  }

  return history;
}

export function formatDateKey(date: Date, timeZone = 'Asia/Karachi'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

