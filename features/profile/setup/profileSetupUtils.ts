import { DAILY_QUOTA_RANGE } from '@/lib/profile-options';

type ProgressSource = {
  fullName?: string | null;
  country?: string | null;
  level?: string | number | null | '';
  time?: string | null;
  daysPerWeek?: number | '' | null;
  phoneVerified?: boolean;
};

export const DEFAULT_DAILY_QUOTA = 4;

export const clampDailyQuota = (value: number | null | undefined): number => {
  if (!Number.isFinite(value ?? Number.NaN)) return DEFAULT_DAILY_QUOTA;
  const coerced = Math.round(Number(value));
  return Math.min(DAILY_QUOTA_RANGE.max, Math.max(DAILY_QUOTA_RANGE.min, coerced));
};

export const computeProgressFromValues = ({
  fullName,
  country,
  level,
  time,
  daysPerWeek,
  phoneVerified,
}: ProgressSource): number => {
  const requiredCount = 6;
  const filled = [
    Boolean(fullName),
    Boolean(country),
    Boolean(level),
    Boolean(time),
    Boolean(daysPerWeek),
    Boolean(phoneVerified),
  ].filter(Boolean).length;
  return Math.round((filled / requiredCount) * 100);
};

export const phoneRegex = /^\+?[1-9]\d{1,14}$/;

