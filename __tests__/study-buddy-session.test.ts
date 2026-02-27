import { describe, expect, it } from 'vitest';

import {
  activeItemIndex,
  applyItemStatus,
  assertTransition,
  computeDuration,
  hydrateSession,
  sanitiseItems,
  type StudyBuddySession,
  type StudyBuddySessionRow,
} from '@/services/study-buddy/session';

function createSession(items: Parameters<typeof sanitiseItems>[0]): StudyBuddySession {
  const hydrated = hydrateSession({
    id: 'session-1',
    user_id: 'user-1',
    items,
    state: 'pending',
    created_at: new Date('2024-01-01T10:00:00Z').toISOString(),
    updated_at: null,
    started_at: null,
    ended_at: null,
    duration_minutes: null,
    ai_plan_id: null,
    xp_earned: 0,
  } as StudyBuddySessionRow);

  if (!hydrated) throw new Error('Session failed to hydrate in test');
  return hydrated;
}

describe('sanitiseItems', () => {
  it('normalises strings, clamps minutes, and caps total items', () => {
    const items = sanitiseItems(
      Array.from({ length: 10 }).map((_, idx) => ({
        skill: idx === 0 ? '  Reading  ' : 123,
        minutes: idx === 1 ? 999 : 15,
        topic: idx === 2 ? '   Focus \n block   ' : null,
        note: idx === 3 ? ' remember this ' : undefined,
        status: 'completed',
      })),
    );

    expect(items).toHaveLength(8);
    expect(items[0]).toMatchObject({ skill: 'Reading', minutes: 15, topic: null, status: 'completed' });
    expect(items[1]?.minutes).toBe(240);
    expect(items[2]?.topic).toBe('Focus \n block');
    expect(items[3]?.note).toBe('remember this');
    expect(items.every((item) => ['pending', 'started', 'completed'].includes(item.status))).toBe(true);
  });
});

describe('session state helpers', () => {
  it('computes durations and active indices correctly', () => {
    const session = createSession([
      { skill: 'Reading', minutes: 10, topic: null, status: 'pending' },
      { skill: 'Writing', minutes: 20, topic: null, status: 'started' },
      { skill: 'Listening', minutes: 15, topic: null, status: 'completed' },
    ]);

    expect(computeDuration(session.items)).toBe(45);
    expect(computeDuration(session.items, true)).toBe(15);
    expect(activeItemIndex(session.items)).toBe(0);

    const progressed = applyItemStatus(session, 0, 'completed');
    expect(activeItemIndex(progressed.items)).toBe(1);
  });

  it('enforces sequential transitions', () => {
    const session = createSession([
      { skill: 'Reading', minutes: 10, topic: null, status: 'pending' },
      { skill: 'Writing', minutes: 10, topic: null, status: 'pending' },
    ]);

    expect(() => assertTransition(session, 0, 'started')).not.toThrow();
    expect(() => assertTransition(session, 1, 'started')).toThrowError('Cannot start future items');

    const started = applyItemStatus(session, 0, 'started');
    const completed = applyItemStatus(started, 0, 'completed');

    expect(() => assertTransition(completed, 0, 'completed')).toThrowError('Complete blocks sequentially');
    expect(() => assertTransition(completed, 1, 'completed')).not.toThrow();
  });
});
