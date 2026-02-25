// lib/time/remaining.ts

const MS_IN_SECOND = 1000;
const MS_IN_MINUTE = 60 * MS_IN_SECOND;
const MS_IN_HOUR = 60 * MS_IN_MINUTE;
const MS_IN_DAY = 24 * MS_IN_HOUR;

export type RemainingTimeParts = {
  totalMs: number;
  clampedMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

export type RemainingTimeInput = {
  targetMsUTC: number;
  nowMsUTC: number;
};

export function getRemainingTimeParts({ targetMsUTC, nowMsUTC }: RemainingTimeInput): RemainingTimeParts {
  const totalMs = Math.round(targetMsUTC - nowMsUTC);
  const clampedMs = totalMs > 0 ? totalMs : 0;

  const days = Math.floor(clampedMs / MS_IN_DAY);
  const hours = Math.floor((clampedMs % MS_IN_DAY) / MS_IN_HOUR);
  const minutes = Math.floor((clampedMs % MS_IN_HOUR) / MS_IN_MINUTE);
  const seconds = Math.floor((clampedMs % MS_IN_MINUTE) / MS_IN_SECOND);

  return {
    totalMs,
    clampedMs,
    days,
    hours,
    minutes,
    seconds,
    isPast: totalMs <= 0,
  };
}

export function getRemainingSeconds(input: RemainingTimeInput): number {
  const { clampedMs } = getRemainingTimeParts(input);
  return Math.floor(clampedMs / MS_IN_SECOND);
}
