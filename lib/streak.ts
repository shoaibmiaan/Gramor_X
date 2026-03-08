import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type {
  StreakSummary,
  StreakMutationAction,
  StreakCalendarEntry,
  StreakActivityEntry,
  StreakTaskKey,
  StreakTaskStatus,
} from '@/types/streak';

const STREAK_TIMEOUT_MS = 10_000;
const DAY_MS = 86_400_000;

const STREAK_TASKS: Array<{ key: StreakTaskKey; label: string; href: string }> = [
  { key: 'writing', label: 'Writing submission', href: '/writing' },
  { key: 'speaking', label: 'Speaking practice', href: '/speaking/practice' },
  { key: 'mock', label: 'Mock test', href: '/mock' },
  { key: 'grammar_ai', label: 'Grammar / AI exercise', href: '/ai' },
  { key: 'reading', label: 'Reading activity', href: '/reading' },
];

export const getDayKeyInTZ = (date: Date = new Date(), timeZone = 'Asia/Karachi'): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
};

const prevDayKey = (date: Date, timeZone: string): string => {
  const todayKey = getDayKeyInTZ(date, timeZone);
  let probe = new Date(date.getTime() - 3_600_000);
  let guard = 0;
  while (getDayKeyInTZ(probe, timeZone) === todayKey && guard < 48) {
    probe = new Date(probe.getTime() - 3_600_000);
    guard += 1;
  }
  return getDayKeyInTZ(probe, timeZone);
};

const rangeForDayKey = (dayKey: string): { fromIso: string; toIso: string } => {
  const base = new Date(`${dayKey}T00:00:00.000Z`);
  const next = new Date(base.getTime() + DAY_MS);
  return {
    fromIso: base.toISOString(),
    toIso: next.toISOString(),
  };
};

export type ComputeResult = {
  current: number;
  longest: number;
  todayKey: string;
  changed: boolean;
  reason: 'first' | 'same-day' | 'incremented' | 'reset';
};

export const computeStreakUpdate = ({
  now = new Date(),
  timeZone = 'Asia/Karachi',
  row,
}: {
  now?: Date;
  timeZone?: string;
  row: { current_streak?: number | null; longest_streak?: number | null; last_activity_date?: string | null } | null;
}): ComputeResult => {
  const todayKey = getDayKeyInTZ(now, timeZone);
  const yesterdayKey = prevDayKey(now, timeZone);

  const lastKey = row?.last_activity_date ?? null;
  const currentStreak = Math.max(0, Number(row?.current_streak ?? 0) || 0);
  const longestStreak = Math.max(currentStreak, Number(row?.longest_streak ?? currentStreak) || currentStreak);

  if (!lastKey) {
    return { current: 1, longest: Math.max(1, longestStreak), todayKey, changed: true, reason: 'first' };
  }

  if (lastKey === todayKey) {
    return {
      current: currentStreak || 1,
      longest: Math.max(longestStreak, currentStreak || 1),
      todayKey,
      changed: false,
      reason: 'same-day',
    };
  }

  if (lastKey === yesterdayKey) {
    const next = currentStreak + 1;
    return { current: next, longest: Math.max(longestStreak, next), todayKey, changed: true, reason: 'incremented' };
  }

  return { current: 1, longest: Math.max(longestStreak, 1), todayKey, changed: true, reason: 'reset' };
};

const emptyStreak = (): StreakSummary => ({
  current_streak: 0,
  longest_streak: 0,
  last_activity_date: null,
  next_restart_date: null,
  shields: 0,
  today_completed: false,
  heatmap: [],
  today_tasks: STREAK_TASKS.map((task) => ({ ...task, completed: false })),
  activity_history: [],
});

const normalizeStreak = (payload: Partial<StreakSummary> | null | undefined): StreakSummary => {
  const fallback = emptyStreak();
  const current = typeof payload?.current_streak === 'number' ? payload.current_streak : fallback.current_streak;
  const longest =
    typeof payload?.longest_streak === 'number' ? payload.longest_streak : Math.max(current, fallback.longest_streak);

  return {
    current_streak: current,
    longest_streak: Math.max(longest, current),
    last_activity_date:
      typeof payload?.last_activity_date === 'string' ? payload.last_activity_date : fallback.last_activity_date,
    next_restart_date:
      typeof payload?.next_restart_date === 'string' ? payload.next_restart_date : fallback.next_restart_date,
    shields: typeof payload?.shields === 'number' ? payload.shields : fallback.shields,
    today_completed: Boolean(payload?.today_completed),
    heatmap: Array.isArray(payload?.heatmap) ? payload.heatmap : fallback.heatmap,
    today_tasks: Array.isArray(payload?.today_tasks) ? payload.today_tasks : fallback.today_tasks,
    activity_history: Array.isArray(payload?.activity_history) ? payload.activity_history : fallback.activity_history,
  };
};

async function resolveUserTimezone(client: SupabaseClient, userId: string): Promise<string> {
  const { data } = await client.from('profiles').select('timezone').eq('id', userId).maybeSingle();
  return typeof data?.timezone === 'string' && data.timezone.trim() ? data.timezone : 'Asia/Karachi';
}

async function hasRows(
  client: SupabaseClient,
  table: string,
  userId: string,
  dateColumn: string,
  fromIso: string,
  toIso: string,
): Promise<boolean> {
  const { data, error } = await client
    .from(table)
    .select('id', { head: false, count: 'exact' })
    .eq('user_id', userId)
    .gte(dateColumn, fromIso)
    .lt(dateColumn, toIso)
    .limit(1);

  if (error) {
    console.warn(`[streak] failed to query ${table}.${dateColumn}`, error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

async function buildTaskStatusForDay(client: SupabaseClient, userId: string, dayKey: string): Promise<StreakTaskStatus[]> {
  const { fromIso, toIso } = rangeForDayKey(dayKey);

  const [writingDone, speakingDone, mockDone, readingDone, grammarAiDone] = await Promise.all([
    hasRows(client, 'writing_attempts', userId, 'updated_at', fromIso, toIso),
    hasRows(client, 'speaking_attempts', userId, 'created_at', fromIso, toIso),
    hasRows(client, 'mock_full_attempts', userId, 'submitted_at', fromIso, toIso),
    hasRows(client, 'reading_responses', userId, 'created_at', fromIso, toIso),
    hasRows(client, 'task_runs', userId, 'completed_at', fromIso, toIso),
  ]);

  const doneMap: Record<StreakTaskKey, boolean> = {
    writing: writingDone,
    speaking: speakingDone,
    mock: mockDone,
    reading: readingDone,
    grammar_ai: grammarAiDone,
  };

  return STREAK_TASKS.map((task) => ({
    ...task,
    completed: doneMap[task.key],
  }));
}

async function buildRecentActivityHistory(
  client: SupabaseClient,
  userId: string,
  timeZone: string,
  daysBack = 21,
): Promise<StreakActivityEntry[]> {
  const history: StreakActivityEntry[] = [];
  const today = new Date();

  for (let offset = 0; offset < daysBack; offset += 1) {
    const day = new Date(today.getTime() - offset * DAY_MS);
    const dayKey = getDayKeyInTZ(day, timeZone);
    const tasks = await buildTaskStatusForDay(client, userId, dayKey);
    const completed = tasks.filter((task) => task.completed).map((task) => task.key);
    if (completed.length > 0) {
      history.push({ date: dayKey, tasks: completed });
    }
  }

  return history.sort((a, b) => a.date.localeCompare(b.date));
}

async function buildCalendarFromAttempts(
  client: SupabaseClient,
  userId: string,
  daysBack: number,
): Promise<StreakCalendarEntry[]> {
  const boundedDaysBack = Math.max(1, Math.min(365, Math.floor(daysBack)));
  const today = new Date();
  const start = new Date(today.getTime() - (boundedDaysBack - 1) * DAY_MS);

  const fromIso = start.toISOString();
  const toIso = new Date(today.getTime() + DAY_MS).toISOString();

  const [writingRows, speakingRows, mockRows, readingRows, taskRunRows] = await Promise.all([
    client
      .from('writing_attempts')
      .select('updated_at')
      .eq('user_id', userId)
      .gte('updated_at', fromIso)
      .lt('updated_at', toIso),
    client
      .from('speaking_attempts')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    client
      .from('mock_full_attempts')
      .select('submitted_at')
      .eq('user_id', userId)
      .gte('submitted_at', fromIso)
      .lt('submitted_at', toIso),
    client
      .from('reading_responses')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', fromIso)
      .lt('created_at', toIso),
    client
      .from('task_runs')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', fromIso)
      .lt('completed_at', toIso),
  ]);

  const responses = [writingRows, speakingRows, mockRows, readingRows, taskRunRows];
  const responseTables = ['writing_attempts', 'speaking_attempts', 'mock_full_attempts', 'reading_responses', 'task_runs'];
  responses.forEach((response, index) => {
    if (response.error) {
      const tableName = responseTables[index];
      console.warn(`[streak] calendar fallback query failed for ${tableName}`, response.error.message);
    }
  });

  const activeDays = new Set<string>();
  const pushDate = (value: unknown) => {
    if (typeof value !== 'string' || !value) return;
    activeDays.add(getDayKeyInTZ(new Date(value), 'UTC'));
  };

  writingRows.data?.forEach((row: any) => pushDate(row?.updated_at));
  speakingRows.data?.forEach((row: any) => pushDate(row?.created_at));
  mockRows.data?.forEach((row: any) => pushDate(row?.submitted_at));
  readingRows.data?.forEach((row: any) => pushDate(row?.created_at));
  taskRunRows.data?.forEach((row: any) => pushDate(row?.completed_at));

  const calendar: StreakCalendarEntry[] = [];
  for (let offset = boundedDaysBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    const dayKey = getDayKeyInTZ(date, 'UTC');
    calendar.push({ date: dayKey, active: activeDays.has(dayKey) });
  }

  return calendar;
}

export async function getUserStreak(client: SupabaseClient, userId: string): Promise<StreakSummary> {
  const timeZone = await resolveUserTimezone(client, userId);
  const today = getDayKeyInTZ(new Date(), timeZone);

  const [{ data: streakData, error: streakErr }, { data: shieldData }, todayTasks, activityHistory] =
    await Promise.all([
      client
        .from('streaks')
        .select('current, longest, last_active_date')
        .eq('user_id', userId)
        .maybeSingle(),
      client.from('streak_shields').select('tokens').eq('user_id', userId).maybeSingle(),
      buildTaskStatusForDay(client, userId, today),
      buildRecentActivityHistory(client, userId, timeZone, 21),
    ]);

  if (streakErr) throw streakErr;

  let heatmap: StreakCalendarEntry[] = [];
  try {
    heatmap = await getStreakCalendar(client, userId, 84);
  } catch (error) {
    console.warn('[streak] failed to build heatmap calendar; using empty heatmap', error);
  }

  const lastActivity = streakData?.last_active_date ?? null;

  return normalizeStreak({
    current_streak: streakData?.current ?? 0,
    longest_streak: streakData?.longest ?? streakData?.current ?? 0,
    last_activity_date: lastActivity,
    next_restart_date: null,
    shields: shieldData?.tokens ?? 0,
    today_completed: lastActivity === today,
    heatmap,
    today_tasks: todayTasks,
    activity_history: activityHistory,
  });
}

export async function updateStreak(client: SupabaseClient, userId: string, now: Date = new Date()): Promise<StreakSummary> {
  const timeZone = await resolveUserTimezone(client, userId);
  const { data: row, error } = await client
    .from('streaks')
    .select('current, longest, last_active_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const computed = computeStreakUpdate({
    now,
    timeZone,
    row: {
      current_streak: row?.current,
      longest_streak: row?.longest,
      last_activity_date: row?.last_active_date,
    },
  });

  if (computed.changed) {
    const { error: upsertError } = await client.from('streaks').upsert(
      {
        user_id: userId,
        current: computed.current,
        longest: computed.longest,
        last_active_date: computed.todayKey,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (upsertError) throw upsertError;
  }

  return getUserStreak(client, userId);
}

export async function resetStreak(client: SupabaseClient, userId: string): Promise<StreakSummary> {
  const { error } = await client
    .from('streaks')
    .upsert({ user_id: userId, current: 0, longest: 0, last_active_date: null }, { onConflict: 'user_id' });
  if (error) throw error;
  return getUserStreak(client, userId);
}

export async function getStreakCalendar(
  client: SupabaseClient,
  userId: string,
  daysBack = 84,
): Promise<StreakCalendarEntry[]> {
  const boundedDaysBack = Math.max(1, Math.min(365, Math.floor(daysBack)));
  const { data, error } = await client.rpc('get_streak_history', {
    p_user_id: userId,
    p_days_back: boundedDaysBack,
  });

  if (!error && Array.isArray(data)) {
    return data.map((entry: any) => ({
      date: String(entry?.date ?? ''),
      active: Number(entry?.completed ?? 0) > 0,
    }));
  }

  if (error) {
    console.warn('[streak] get_streak_history rpc failed; using fallback calendar builder', {
      code: error.code,
      message: error.message,
    });
  }

  return buildCalendarFromAttempts(client, userId, boundedDaysBack);
}

export function computeDailyStreak(entries: { date: string | Date }[]): { currentStreak: number; longestStreak: number } {
  if (!entries.length) return { currentStreak: 0, longestStreak: 0 };
  const unique = Array.from(new Set(entries.map((entry) => getDayKeyInTZ(new Date(entry.date), 'UTC')))).sort();
  let longest = 1;
  let current = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const diff = (new Date(unique[index]).getTime() - new Date(unique[index - 1]).getTime()) / DAY_MS;
    current = diff === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return { currentStreak: current, longestStreak: longest };
}

const withTimeout = async <T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = STREAK_TIMEOUT_MS): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await task(controller.signal);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
};

const handleMutation = async (payload: { action?: StreakMutationAction; date?: string }): Promise<StreakSummary> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) throw new Error('Unauthorized');

  const body: Record<string, unknown> = {};
  if (payload.action) body.action = payload.action;
  if (payload.date) body.date = payload.date;

  const res = await withTimeout((signal) =>
    fetch('/api/streak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
      signal,
    }),
  );

  if (!res.ok) throw new Error(`Failed to update streak: ${res.status}`);
  return normalizeStreak((await res.json().catch(() => null)) as Partial<StreakSummary> | null);
};

export const fetchStreak = async (): Promise<StreakSummary> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) return emptyStreak();

  const res = await withTimeout((signal) =>
    fetch('/api/streak', {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal,
    }),
  );

  if (res.status === 401) return emptyStreak();
  if (!res.ok) throw new Error(`Failed to fetch streak: ${res.status}`);

  return normalizeStreak((await res.json().catch(() => null)) as Partial<StreakSummary> | null);
};

export const incrementStreak = async ({ useShield = false }: { useShield?: boolean }) =>
  handleMutation({ action: useShield ? 'use' : undefined });

export const claimShield = async () => handleMutation({ action: 'claim' });
export const scheduleRecovery = async (date: string) => handleMutation({ action: 'schedule', date });
