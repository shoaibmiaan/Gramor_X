const MS_PER_DAY = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

type RawHistoryEntry = {
  date?: string | Date | null;
  completed?: number | null;
  total?: number | null;
};

type FormatterKey = `${string}|${string}`;

const formatterCache = new Map<FormatterKey, Intl.DateTimeFormat>();

function getFormatter(timeZone: string, locale = 'en-CA') {
  const key: FormatterKey = `${locale}|${timeZone}`;
  if (formatterCache.has(key)) {
    return formatterCache.get(key)!;
  }

  try {
    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(key, fmt);
    return fmt;
  } catch {
    const fallback = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(key, fallback);
    return fallback;
  }
}

function toDateKey(value: unknown, timeZone: string): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DATE_ONLY.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getFormatter(timeZone).format(parsed);
    }
    return null;
  }

  if (value instanceof Date) {
    return getFormatter(timeZone).format(value);
  }

  return null;
}

function clampCount(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
}

function normaliseEntry(entry: RawHistoryEntry | null | undefined, timeZone: string) {
  if (!entry) return null;
  const key = toDateKey(entry.date ?? null, timeZone);
  if (!key) return null;

  const completed = clampCount(entry.completed);
  const totalRaw = clampCount(entry.total);
  const total = Math.max(totalRaw, completed, completed > 0 ? 1 : 0);

  return { key, completed, total } as const;
}

export type StreakHistoryEntry = {
  date: string;
  completed: number;
  total: number;
};

export function buildCompletionHistory(
  rawHistory: RawHistoryEntry[] | null | undefined,
  daysBack = 84,
  timeZone = 'Asia/Karachi',
): StreakHistoryEntry[] {
  const limit = Number.isFinite(daysBack) && daysBack > 0 ? Math.min(Math.floor(daysBack), 365) : 84;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (limit - 1) * MS_PER_DAY);

  const map = new Map<string, { completed: number; total: number }>();
  if (Array.isArray(rawHistory)) {
    for (const item of rawHistory) {
      const normalised = normaliseEntry(item, timeZone);
      if (!normalised) continue;
      const previous = map.get(normalised.key);
      if (previous) {
        const completed = Math.max(previous.completed, normalised.completed);
        const total = Math.max(previous.total, normalised.total, completed);
        map.set(normalised.key, { completed, total });
      } else {
        map.set(normalised.key, {
          completed: normalised.completed,
          total: normalised.total,
        });
      }
    }
  }

  const history: StreakHistoryEntry[] = [];
  for (let offset = 0; offset < limit; offset += 1) {
    const current = new Date(start.getTime() + offset * MS_PER_DAY);
    const key = getFormatter(timeZone).format(current);
    const value = map.get(key);
    const completed = value?.completed ?? 0;
    const total = value ? Math.max(value.total, completed, completed > 0 ? 1 : 0) : 0;
    history.push({ date: key, completed, total });
  }

  return history;
}
