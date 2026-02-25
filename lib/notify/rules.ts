import { DateTime } from 'luxon';

import type { Channel } from '@/types/notifications';

export interface QuietHoursInput {
  now?: Date;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string | null;
}

function parseTimeFragment(value?: string | null, zone = 'UTC') {
  if (!value) return null;
  const format = value.length === 8 ? 'HH:mm:ss' : 'HH:mm';
  const parsed = DateTime.fromFormat(value, format, { zone });
  return parsed.isValid ? parsed : null;
}

export function isInQuietHours({
  now = new Date(),
  quietHoursStart,
  quietHoursEnd,
  timezone = 'UTC',
}: QuietHoursInput): boolean {
  if (!quietHoursStart || !quietHoursEnd) {
    return false;
  }

  const zone = timezone || 'UTC';
  const current = DateTime.fromJSDate(now).setZone(zone);
  if (!current.isValid) {
    return false;
  }

  const startTime = parseTimeFragment(quietHoursStart, zone);
  const endTime = parseTimeFragment(quietHoursEnd, zone);

  if (!startTime || !endTime) {
    return false;
  }

  const currentSeconds = current.hour * 3600 + current.minute * 60 + current.second;
  const startSeconds = startTime.hour * 3600 + startTime.minute * 60 + startTime.second;
  const endSeconds = endTime.hour * 3600 + endTime.minute * 60 + endTime.second;

  if (startSeconds === endSeconds) {
    return false;
  }

  if (startSeconds < endSeconds) {
    return currentSeconds >= startSeconds && currentSeconds < endSeconds;
  }

  return currentSeconds >= startSeconds || currentSeconds < endSeconds;
}

export interface AllowedChannelsInput {
  preferences: Partial<Record<Channel, boolean>>;
  requestedChannels?: Channel[] | null;
  quiet?: boolean;
  quietOverrides?: Channel[];
}

export function allowedChannels({
  preferences,
  requestedChannels,
  quiet = false,
  quietOverrides = [],
}: AllowedChannelsInput): Channel[] {
  const enabled = new Set<Channel>();
  const baseChannels = requestedChannels && requestedChannels.length > 0
    ? requestedChannels
    : (Object.keys(preferences) as Channel[]);

  const quietAllowed = quiet ? new Set<Channel>(quietOverrides) : null;

  for (const channel of baseChannels) {
    if (!preferences[channel]) continue;
    if (quiet && quietAllowed && !quietAllowed.has(channel)) {
      continue;
    }
    enabled.add(channel);
  }

  if (quiet && quietAllowed && quietAllowed.size === 0) {
    return [];
  }

  return Array.from(enabled.values());
}
