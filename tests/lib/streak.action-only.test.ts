/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { computeStreakUpdate, isActionableStreakActivityType } from '@/lib/streak';

describe('streak action-only helpers', () => {
  it('accepts only allow-listed activity types', () => {
    expect(isActionableStreakActivityType('writing')).toBe(true);
    expect(isActionableStreakActivityType('speaking')).toBe(true);
    expect(isActionableStreakActivityType('reading')).toBe(true);
    expect(isActionableStreakActivityType('vocabulary')).toBe(true);
    expect(isActionableStreakActivityType('ai_lesson')).toBe(true);
    expect(isActionableStreakActivityType('mock')).toBe(true);
    expect(isActionableStreakActivityType('dashboard')).toBe(false);
    expect(isActionableStreakActivityType('lesson_view')).toBe(false);
  });

  it('increments streak on consecutive PKT days and resets after a miss', () => {
    const day1 = new Date('2026-04-05T10:00:00+05:00');
    const day2 = new Date('2026-04-06T10:00:00+05:00');
    const day4 = new Date('2026-04-08T10:00:00+05:00');

    const first = computeStreakUpdate({ now: day1, row: null });
    expect(first.current).toBe(1);

    const consecutive = computeStreakUpdate({
      now: day2,
      row: {
        current_streak: first.current,
        longest_streak: first.longest,
        last_activity_date: first.todayKey,
      },
    });
    expect(consecutive.current).toBe(2);

    const missed = computeStreakUpdate({
      now: day4,
      row: {
        current_streak: consecutive.current,
        longest_streak: consecutive.longest,
        last_activity_date: consecutive.todayKey,
      },
    });

    expect(missed.reason).toBe('reset');
    expect(missed.current).toBe(1);
    expect(missed.longest).toBe(2);
  });
});
