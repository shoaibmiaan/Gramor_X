import * as React from 'react';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { cn } from '@/lib/utils';

type TimerProgressProps = {
  total?: number;
  answered?: number;
  durationSeconds?: number;
  initialElapsedSec?: number;
  isActive?: boolean;
  onExpire?: () => void;
};

const TimerProgress: React.FC<TimerProgressProps> = ({
  total = 40,
  answered,
  durationSeconds = 3600,
  initialElapsedSec = 0,
  isActive = true,
  onExpire,
}) => {
  const [sec, setSec] = React.useState(initialElapsedSec);

  React.useEffect(() => {
    if (!isActive) return undefined;

    const id = window.setInterval(() => {
      setSec((s) => {
        if (s + 1 >= durationSeconds) {
          window.clearInterval(id);
          return durationSeconds;
        }
        return s + 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [isActive, durationSeconds]);

  React.useEffect(() => {
    setSec(initialElapsedSec);
  }, [initialElapsedSec]);

  const clampedDuration = durationSeconds > 0 ? durationSeconds : 3600;
  const remaining = Math.max(clampedDuration - sec, 0);
  const mins = Math.floor(remaining / 60);
  const rem = remaining % 60;
  const pct = Math.min(100, Math.round(((clampedDuration - remaining) / clampedDuration) * 100));

  // Multi‑stage warning thresholds
  const warning10 = remaining <= 600;    // 10 minutes
  const warning5 = remaining <= 300;     // 5 minutes
  const warning1 = remaining <= 60;      // 1 minute

  const timerColor = warning1
    ? 'text-red-500 animate-pulse'
    : warning5
    ? 'text-orange-400'
    : warning10
    ? 'text-amber-400'
    : 'text-foreground';

  React.useEffect(() => {
    if (!isActive) return;
    if (remaining === 0 && onExpire) {
      onExpire();
    }
  }, [remaining, isActive, onExpire]);

  return (
    <div className="min-w-[170px] text-xs text-muted-foreground">
      <div className="text-[11px] uppercase tracking-wide opacity-80 text-center">
        Time remaining
      </div>
      <div
        className={cn('mt-1 text-center font-mono text-2xl font-semibold', timerColor)}
        role="timer"
        aria-label={`${mins} minutes and ${rem} seconds remaining`}
      >
        {String(mins).padStart(2, '0')}:{String(rem).padStart(2, '0')}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <ProgressBar value={pct} aria-label="Time elapsed" />
        {answered != null && (
          <span className="whitespace-nowrap text-muted-foreground">
            {answered}/{total} answered
          </span>
        )}
      </div>
    </div>
  );
};

export default TimerProgress;