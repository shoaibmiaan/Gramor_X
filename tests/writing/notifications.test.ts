import { describe, expect, it } from 'vitest';

import {
  buildRetakeReminder,
  ensureNotificationChannels,
  getDailyMicroPrompt,
  shouldSendMicroPromptToday,
} from '@/lib/writing/notifications';

const SAMPLE_DATE = new Date('2024-11-01T09:15:00Z');

describe('writing notifications helpers', () => {
  it('returns deterministic micro prompt per UTC day', () => {
    const first = getDailyMicroPrompt(SAMPLE_DATE);
    const second = getDailyMicroPrompt(new Date('2024-11-01T22:00:00Z'));

    expect(first.index).toBe(second.index);
    expect(first.message).toBe(second.message);
  });

  it('ensures in_app channel is always present', () => {
    expect(ensureNotificationChannels(null)).toEqual(['in_app']);
    expect(ensureNotificationChannels(['whatsapp'])).toEqual(['in_app', 'whatsapp']);
    expect(ensureNotificationChannels(['in_app', 'email', 'unknown'])).toEqual(['in_app', 'email']);
  });

  it('detects same day micro prompt delivery', () => {
    const now = new Date('2024-11-02T05:00:00Z');
    const earlier = '2024-11-02T00:10:00Z';
    expect(shouldSendMicroPromptToday(null, now)).toBe(true);
    expect(shouldSendMicroPromptToday(earlier, now)).toBe(false);
  });

  it('builds retake reminder summary with missing actions', () => {
    const reminder = buildRetakeReminder(
      {
        windowStart: '2024-10-20T00:00:00Z',
        windowEnd: '2024-11-03T00:00:00Z',
        redraftsCompleted: 2,
        drillsCompleted: 5,
        mocksCompleted: 1,
      },
      { redrafts: 6, drills: 8, mocks: 2 },
    );

    expect(reminder.missing).toEqual(['4 redrafts', '3 drills', '1 mock']);
    expect(reminder.completion).toBeGreaterThan(0);
    expect(typeof reminder.message).toBe('string');
  });
});
