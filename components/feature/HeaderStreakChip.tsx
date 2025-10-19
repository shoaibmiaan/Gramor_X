import * as React from 'react';
import { useStreak } from '@/hooks/useStreak';

export function HeaderStreakChip() {
  const { current, loading, error } = useStreak();

  const value = React.useMemo(() => {
    if (loading) return '…';
    if (error) return '—';
    return Math.max(0, current);
  }, [current, error, loading]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-small bg-background/70 backdrop-blur">
      <span aria-hidden="true">🔥</span>
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">day streak</span>
    </div>
  );
}
