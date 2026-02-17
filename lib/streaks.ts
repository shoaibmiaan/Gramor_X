import type { SupabaseClient } from '@supabase/supabase-js';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (tz: string) => {
  if (formatterCache.has(tz)) return formatterCache.get(tz)!;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(tz, fmt);
    return fmt;
  } catch {
    const fallback = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatterCache.set(tz, fallback);
    return fallback;
  }
};

const formatDay = (date: Date, tz: string): string => {
  try {
    return getFormatter(tz).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
};

export const dayKey = (date: Date, tz: string): string => formatDay(date, tz);

const prevDayKey = (date: Date, tz: string): string => {
  const todayKey = formatDay(date, tz);
  let probe = new Date(date.getTime() - 3600000);
  let guard = 0;
  while (formatDay(probe, tz) === todayKey && guard < 48) {
    probe = new Date(probe.getTime() - 3600000);
    guard += 1;
  }
  return formatDay(probe, tz);
};

type StreakRow = {
  current_streak?: number | null;
  last_activity_date?: string | null;
};

type ComputeParams = {
  now?: Date;
  tz: string;
  row: StreakRow | null;
};

export type ComputeResult = {
  current: number;
  todayKey: string;
  changed: boolean;
  reason: 'first' | 'same-day' | 'incremented' | 'reset';
};

export const computeStreakUpdate = ({ now = new Date(), tz, row }: ComputeParams): ComputeResult => {
  const todayKey = dayKey(now, tz);
  const yesterdayKey = prevDayKey(now, tz);

  const lastKey = row?.last_activity_date ?? null;
  const currentStreak = row?.current_streak ?? 0;

  if (!lastKey) {
    return { current: 1, todayKey, changed: true, reason: 'first' };
  }

  if (lastKey === todayKey) {
    return { current: currentStreak || 1, todayKey, changed: false, reason: 'same-day' };
  }

  if (lastKey === yesterdayKey) {
    const next = (currentStreak || 0) + 1;
    return { current: next, todayKey, changed: true, reason: 'incremented' };
  }

  return { current: 1, todayKey, changed: true, reason: 'reset' };
};

/**
 * Sync a user's streak on the server using their timezone.
 * Returns the updated streak count.
 */
export async function syncStreak(
  supabase: SupabaseClient,
  userId: string,
  tz: string,
  now: Date = new Date(),
): Promise<number> {
  const compute = ({ data }: { data: StreakRow | null }) => computeStreakUpdate({ now, tz, row: data });

  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, last_activity_date')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const result = compute({ data });

  if (!result.changed) {
    return result.current;
  }

  console.info(
    '[syncStreak] correction',
    JSON.stringify({ userId, tz, reason: result.reason, from: data?.current_streak ?? 0, to: result.current }),
  );

  const { error: upsertErr } = await supabase
    .from('user_streaks')
    .upsert({ user_id: userId, current_streak: result.current, last_activity_date: result.todayKey });
  if (upsertErr) throw upsertErr;
  return result.current;
}
