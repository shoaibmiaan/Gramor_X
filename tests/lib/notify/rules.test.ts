import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { allowedChannels, isInQuietHours } from '@/lib/notify/rules';

describe('isInQuietHours', () => {
  it('handles wrap-around quiet hours', () => {
    const zone = 'UTC';
    const start = '22:00';
    const end = '07:00';

    const lateNight = DateTime.fromISO('2024-01-01T23:30:00Z').toJSDate();
    const earlyMorning = DateTime.fromISO('2024-01-02T06:30:00Z').toJSDate();
    const midday = DateTime.fromISO('2024-01-02T12:00:00Z').toJSDate();

    expect(
      isInQuietHours({ now: lateNight, quietHoursStart: start, quietHoursEnd: end, timezone: zone }),
    ).toBe(true);
    expect(
      isInQuietHours({ now: earlyMorning, quietHoursStart: start, quietHoursEnd: end, timezone: zone }),
    ).toBe(true);
    expect(
      isInQuietHours({ now: midday, quietHoursStart: start, quietHoursEnd: end, timezone: zone }),
    ).toBe(false);
  });
});

describe('allowedChannels', () => {
  it('filters channels by preferences and quiet hours', () => {
    const preferences = { email: true, whatsapp: true } as const;

    expect(
      allowedChannels({ preferences, requestedChannels: ['email', 'whatsapp'], quiet: false }),
    ).toEqual(['email', 'whatsapp']);

    expect(
      allowedChannels({ preferences, requestedChannels: ['email', 'whatsapp'], quiet: true, quietOverrides: ['email'] }),
    ).toEqual(['email']);

    expect(
      allowedChannels({ preferences, requestedChannels: ['email', 'whatsapp'], quiet: true, quietOverrides: [] }),
    ).toEqual([]);
  });
});
