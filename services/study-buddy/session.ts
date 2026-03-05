// services/study-buddy/session.ts
// Central lifecycle helpers for Study Buddy sessions (validation, gating, XP, analytics).

import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

import { xpDailyCap } from '@/lib/plan/gates';
import type { PlanId } from '@/types/pricing';
import { createRequestLogger, type RequestLogger } from '@/lib/obs/logger';
import { trackor } from '@/lib/analytics/trackor.server';

export const STUDY_SESSION_STATES = ['pending', 'started', 'completed', 'cancelled'] as const;
export type StudySessionState = (typeof STUDY_SESSION_STATES)[number];

export type StudyBuddyItem = {
  skill: string;
  minutes: number;
  topic: string | null;
  status: 'pending' | 'started' | 'completed';
  note: string | null;
};

export type StudyBuddySessionRow = {
  id: string;
  user_id: string;
  items: unknown;
  state: StudySessionState;
  created_at: string;
  updated_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  ai_plan_id: string | null;
  xp_earned: number | null;
};

export type StudyBuddySession = Omit<StudyBuddySessionRow, 'items'> & { items: StudyBuddyItem[] };

export type StudyBuddyAnalyticsEvent =
  | 'study_session_created'
  | 'study_session_started'
  | 'study_item_completed'
  | 'study_session_completed'
  | 'study_session_abandoned';

export type AwardXpOutcome = {
  requested: number;
  awarded: number;
  capped: boolean;
  remainingAllowance: number;
  dayIso: string;
};

export class StudyBuddyError extends Error {
  constructor(
    public code: string,
    message: string,
    public meta: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'StudyBuddyError';
  }
}

export class PlanLimitError extends StudyBuddyError {
  constructor(
    code: 'daily_minutes_exceeded' | 'xp_cap_reached',
    public allowed: number,
    public remaining: number,
  ) {
    super(code, code, { allowed, remaining });
  }
}

const LOCAL_TZ = 'Asia/Karachi';

const PLAN_DAILY_MINUTES: Record<PlanId, number | null> = {
  free: 45,
  starter: 180,
  booster: null,
  master: null,
};

function clampMinutes(value: unknown, fallback = 0): number {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return fallback;
  return Math.min(240, Math.round(minutes));
}

function sanitiseString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 160) : null;
}

export function sanitiseItems(raw: unknown): StudyBuddyItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((item) => {
    const skill = sanitiseString(item?.skill) ?? 'General';
    const status =
      item?.status === 'completed' || item?.status === 'started' ? item.status : ('pending' as const);
    return {
      skill,
      minutes: clampMinutes(item?.minutes, 5),
      topic: sanitiseString(item?.topic),
      status,
      note: sanitiseString(item?.note),
    } satisfies StudyBuddyItem;
  });
}

export function hydrateSession(row: StudyBuddySessionRow | null | undefined): StudyBuddySession | null {
  if (!row) return null;
  return {
    ...row,
    items: sanitiseItems(row.items),
    xp_earned: Number(row.xp_earned ?? 0),
    duration_minutes: row.duration_minutes == null ? null : clampMinutes(row.duration_minutes, 0),
  };
}

export function computeDuration(items: StudyBuddyItem[], onlyCompleted = false): number {
  return items.reduce((sum, item) => {
    if (onlyCompleted && item.status !== 'completed') return sum;
    return sum + clampMinutes(item.minutes, 0);
  }, 0);
}

export function activeItemIndex(items: StudyBuddyItem[]): number {
  const idx = items.findIndex((item) => item.status !== 'completed');
  return idx === -1 ? items.length : idx;
}

export function learningDayWindow(now = DateTime.now().setZone(LOCAL_TZ)) {
  const start = now.startOf('day');
  const end = start.plus({ days: 1 });
  return {
    startIso: start.toUTC().toISO(),
    endIso: end.toUTC().toISO(),
    dayIso: start.toISODate() ?? start.toFormat('yyyy-LL-dd'),
  };
}

function plannedMinutes(row: StudyBuddySession): number {
  if (row.duration_minutes != null && row.duration_minutes > 0) return row.duration_minutes;
  return computeDuration(row.items);
}

export async function enforceDailyMinutesLimit(
  client: SupabaseClient<any>,
  userId: string,
  plan: PlanId,
  minutesRequested: number,
): Promise<void> {
  const allowance = PLAN_DAILY_MINUTES[plan];
  if (allowance == null) return;

  const window = learningDayWindow();
  const { data, error } = await client
    .from('study_buddy_sessions')
    .select('id, items, duration_minutes, state, created_at, started_at')
    .eq('user_id', userId)
    .gte('created_at', window.startIso)
    .lt('created_at', window.endIso)
    .in('state', ['pending', 'started', 'completed']);

  if (error) throw new StudyBuddyError('daily_limit_query_failed', error.message);

  const totalPlanned = (data ?? []).reduce((sum, row) => {
    const hydrated = hydrateSession(row as unknown as StudyBuddySessionRow);
    if (!hydrated) return sum;
    return sum + plannedMinutes(hydrated);
  }, 0);

  if (totalPlanned + minutesRequested > allowance) {
    const remaining = Math.max(0, allowance - totalPlanned);
    throw new PlanLimitError('daily_minutes_exceeded', allowance, remaining);
  }
}

export async function fetchSession(
  client: SupabaseClient<any>,
  id: string,
  userId: string,
): Promise<StudyBuddySession | null> {
  const { data, error } = await client
    .from('study_buddy_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle<StudyBuddySessionRow>();

  if (error) throw new StudyBuddyError('load_failed', error.message);
  return hydrateSession(data);
}

export function assertTransition(
  session: StudyBuddySession,
  index: number,
  status: 'pending' | 'started' | 'completed',
): void {
  if (index < 0 || index >= session.items.length) {
    throw new StudyBuddyError('invalid_index', 'Item index out of bounds');
  }

  const current = activeItemIndex(session.items);

  if (status === 'started' && index > current) {
    throw new StudyBuddyError('out_of_order_start', 'Cannot start future items');
  }

  if (status === 'completed' && index !== current) {
    throw new StudyBuddyError('out_of_order_complete', 'Complete blocks sequentially');
  }

  if (status === 'pending' && session.items[index].status === 'pending') {
    return; // no-op
  }

  if (session.state === 'completed') {
    throw new StudyBuddyError('session_completed', 'Session already completed');
  }
}

export function applyItemStatus(
  session: StudyBuddySession,
  index: number,
  status: 'pending' | 'started' | 'completed',
  note?: string | null,
): StudyBuddySession {
  const items = session.items.map((item) => ({ ...item }));
  const target = items[index];
  items[index] = {
    ...target,
    status,
    note: note != null ? sanitiseString(note) : target.note,
  };

  return { ...session, items };
}

export async function recordEvent(event: StudyBuddyAnalyticsEvent, payload: Record<string, unknown>) {
  try {
    await trackor.log(event, payload);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.warn('[study-buddy] analytics emit failed', event, payload, error);
    }
  }
}

export async function awardStudyBuddyXp(
  client: SupabaseClient<any>,
  session: StudyBuddySession,
  plan: PlanId,
): Promise<AwardXpOutcome> {
  const completedMinutes = computeDuration(session.items, true);
  const requested = completedMinutes * 4;
  if (requested <= 0) {
    return { requested: 0, awarded: 0, capped: false, remainingAllowance: xpDailyCap(plan), dayIso: learningDayWindow().dayIso };
  }

  const window = learningDayWindow();

  const { data: existingEvent, error: fetchExisting } = await client
    .from('user_xp_events')
    .select('id, points, metadata')
    .eq('user_id', session.user_id)
    .eq('source', 'study_buddy')
    .eq('reason', 'study_session_completed')
    .contains('metadata', { session_id: session.id })
    .maybeSingle<{ id: string; points: number; metadata: Record<string, unknown> }>();

  if (fetchExisting) throw new StudyBuddyError('xp_lookup_failed', fetchExisting.message);

  if (existingEvent) {
    return {
      requested,
      awarded: Number(existingEvent.points ?? 0),
      capped: false,
      remainingAllowance: Math.max(0, (xpDailyCap(plan) ?? 0) - Number(existingEvent.points ?? 0)),
      dayIso: window.dayIso,
    };
  }

  const cap = xpDailyCap(plan);
  const { data: todaysEvents, error: todaysErr } = await client
    .from('user_xp_events')
    .select('points')
    .eq('user_id', session.user_id)
    .eq('source', 'study_buddy')
    .gte('created_at', window.startIso)
    .lt('created_at', window.endIso);

  if (todaysErr) throw new StudyBuddyError('xp_window_failed', todaysErr.message);

  const totalToday = (todaysEvents ?? []).reduce((sum, row) => sum + Number(row.points ?? 0), 0);
  const remainingAllowance = Math.max(0, (cap ?? 0) - totalToday);
  const awarded = cap == null ? requested : Math.min(requested, remainingAllowance);
  const capped = cap != null && awarded < requested;

  if (awarded <= 0) {
    throw new PlanLimitError('xp_cap_reached', cap ?? 0, remainingAllowance);
  }

  const metadata = {
    session_id: session.id,
    minutes: completedMinutes,
    requested_points: requested,
  };

  const { error: insertErr } = await client.from('user_xp_events').insert({
    user_id: session.user_id,
    source: 'study_buddy',
    points: awarded,
    reason: 'study_session_completed',
    metadata,
  });

  if (insertErr) throw new StudyBuddyError('xp_insert_failed', insertErr.message);

  return { requested, awarded, capped, remainingAllowance: Math.max(0, remainingAllowance - awarded), dayIso: window.dayIso };
}

export function createSessionLogger(route: string, userId: string, sessionId?: string): RequestLogger {
  return createRequestLogger(route, { userId, sessionId });
}

