import * as React from 'react';
import { useStreak } from '@/hooks/useStreak';

export function StreakHeatmap() {
  const { heatmap, loading } = useStreak();

  if (loading) {
    return <div className="h-20 w-full animate-pulse rounded bg-muted" aria-hidden="true" />;
  }

  return (
    <div className="grid grid-cols-7 gap-1" aria-label="Streak heatmap">
      {heatmap.slice(-84).map((entry) => (
        <div
          key={entry.date}
          className={entry.active ? 'h-3 w-3 rounded-sm bg-electricBlue' : 'h-3 w-3 rounded-sm bg-muted'}
          title={`${entry.date}: ${entry.active ? 'active' : 'inactive'}`}
        />
      ))}
    </div>
  );
}

export default StreakHeatmap;
