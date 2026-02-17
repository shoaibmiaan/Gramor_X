import { supabase } from '@/lib/supabaseClient';
import type { StreakSummary, StreakMutationAction } from '@/types/streak';

const STREAK_TIMEOUT_MS = 10_000;

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

const emptyStreak = (): StreakSummary => ({
  current_streak: 0,
  longest_streak: 0,
  last_activity_date: null,
  next_restart_date: null,
  shields: 0,
});

const normalizeStreak = (payload: Partial<StreakSummary> | null | undefined): StreakSummary => {
  const fallback = emptyStreak();
  const current = typeof payload?.current_streak === 'number' ? payload.current_streak : fallback.current_streak;
  const longest =
    typeof payload?.longest_streak === 'number'
      ? payload.longest_streak
      : typeof payload?.current_streak === 'number'
        ? payload.current_streak
        : fallback.longest_streak;

  return {
    current_streak: current,
    longest_streak: Math.max(longest, current),
    last_activity_date: typeof payload?.last_activity_date === 'string' ? payload.last_activity_date : fallback.last_activity_date,
    next_restart_date: typeof payload?.next_restart_date === 'string' ? payload.next_restart_date : fallback.next_restart_date,
    shields: typeof payload?.shields === 'number' ? payload.shields : fallback.shields,
  };
};

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

  if (sessionError || !session) {
    console.error('[streak] Session error:', sessionError?.message || 'No session');
    throw new Error('Unauthorized');
  }

  const body: Record<string, unknown> = {};
  if (payload.action) body.action = payload.action;
  if (payload.date) body.date = payload.date;

  let res: Response;
  try {
    res = await withTimeout((signal) =>
      fetch('/api/streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
        signal,
      })
    );
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      throw new Error('Streak request timed out');
    }
    throw error;
  }

  if (!res.ok) {
    console.error('[streak] Mutation failed:', res.status, res.statusText);
    throw new Error(`Failed to update streak: ${res.status}`);
  }

  const raw = (await res.json().catch(() => null)) as Partial<StreakSummary> | null;
  return normalizeStreak(raw);
};

export const fetchStreak = async (): Promise<StreakSummary> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    if (sessionError) {
      console.warn('[fetchStreak] Session error (treating as guest):', sessionError.message);
    }
    return emptyStreak();
  }

  try {
    const res = await withTimeout((signal) =>
      fetch('/api/streak', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal,
      })
    );

    if (res.status === 401) {
      console.info('[fetchStreak] Received 401 from streak API, defaulting to empty streak');
      return emptyStreak();
    }

    if (!res.ok) {
      console.error('[fetchStreak] API error:', res.status, res.statusText);
      throw new Error(`Failed to fetch streak: ${res.status}`);
    }

    const raw = (await res.json().catch(() => null)) as Partial<StreakSummary> | null;
    return normalizeStreak(raw);
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      console.warn('[fetchStreak] Timed out after %dms', STREAK_TIMEOUT_MS);
      throw new Error('Streak request timed out');
    }
    console.error('[fetchStreak] Unexpected error:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch streak');
  }
};

export const incrementStreak = async ({ useShield = false }: { useShield?: boolean }) =>
  handleMutation({ action: useShield ? 'use' : undefined });

export const claimShield = async () => handleMutation({ action: 'claim' });

export const scheduleRecovery = async (date: string) => handleMutation({ action: 'schedule', date });
