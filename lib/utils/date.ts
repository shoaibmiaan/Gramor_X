import { DateTime } from 'luxon';

export function formatTimestamp(iso: string): string {
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return '';
  
  const now = DateTime.now();
  const diff = now.diff(dt, 'days').days;

  if (diff < 1) {
    return dt.toRelative() || dt.toLocaleString(DateTime.TIME_SIMPLE);
  } else if (diff < 7) {
    return dt.toRelative() || dt.toLocaleString(DateTime.DATE_MED);
  } else {
    return dt.toLocaleString(DateTime.DATE_MED);
  }
}

export function isWithinQuietHours(
  startTime: string | null,
  endTime: string | null,
  timezone: string = 'UTC'
): boolean {
  if (!startTime || !endTime) return false;

  const now = DateTime.now().setZone(timezone);
  const start = DateTime.fromFormat(startTime, 'HH:mm:ss').setZone(timezone);
  const end = DateTime.fromFormat(endTime, 'HH:mm:ss').setZone(timezone);

  if (start <= end) {
    return now >= start && now <= end;
  } else {
    //跨越午夜
    return now >= start || now <= end;
  }
}