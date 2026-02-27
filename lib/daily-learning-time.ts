const ACTIVE_LEARNING_TIMEZONE = 'Asia/Karachi';

const activeDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ACTIVE_LEARNING_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getActiveDayISO(referenceDate: Date = new Date()): string {
  return activeDayFormatter.format(referenceDate);
}

export { ACTIVE_LEARNING_TIMEZONE };

