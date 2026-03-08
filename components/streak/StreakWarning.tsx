import * as React from 'react';
import { useStreak } from '@/hooks/useStreak';
import { getDayKeyInTZ } from '@/lib/streak';

export function StreakWarning() {
  const { loading, lastDayKey } = useStreak();
  const todayKey = React.useMemo(() => getDayKeyInTZ(), []);

  if (loading || lastDayKey === todayKey) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
      ⚠ Complete a task today to keep your streak alive
    </div>
  );
}

export default StreakWarning;
