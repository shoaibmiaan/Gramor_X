import { useMemo } from 'react';

import type { UsageLimitsState } from '@/hooks/useUsageLimits';

type UsageMetersProps = {
  usage: UsageLimitsState;
  onUpgrade: () => void;
};

const getResetCountdown = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? '' : 's'}`;
};

const UsageMeters = ({ usage, onUpgrade }: UsageMetersProps) => {
  const items = useMemo(
    () => [
      { label: 'Reading tests', data: usage.readingTests },
      { label: 'Writing feedback', data: usage.writingFeedback },
      { label: 'Speaking analysis', data: usage.speakingAnalysis },
    ],
    [usage],
  );

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <h3 className="text-base font-semibold">Monthly usage</h3>
      <div className="mt-3 space-y-4">
        {items.map((item) => {
          const pct = Math.round((item.data.used / Math.max(1, item.data.limit)) * 100);
          const exhausted = item.data.remaining <= 0;
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="text-muted-foreground">{item.data.used} of {item.data.limit} used</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className={`h-2 rounded-full ${exhausted ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Resets in {getResetCountdown(item.data.resetDate)}</span>
                {exhausted ? (
                  <button type="button" className="text-primary underline" onClick={onUpgrade}>
                    Upgrade
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UsageMeters;
