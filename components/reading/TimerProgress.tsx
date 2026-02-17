import * as React from 'react';
import { ProgressBar } from '@/components/design-system/ProgressBar';

type TimerProgressProps = {
  /** Total questions (for display only) */
  total?: number;
  /** How many answered (optional – shell can wire later) */
  answered?: number;
  /** Total duration (seconds). Default 60 min. */
  durationSeconds?: number;
  /** Initial elapsed seconds if resuming from checkpoint */
  initialElapsedSec?: number;
  /** Whether the timer should actively tick down */
  isActive?: boolean;
  /** Callback fired once when the timer reaches zero */
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
  const pct = Math.min(
    100,
    Math.round(((clampedDuration - remaining) / clampedDuration) * 100),
  );

  const warning = remaining <= 1800 && remaining > 600;
  const critical = remaining <= 600;

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
        className={[
          'mt-1 text-center font-mono text-2xl font-semibold',
          critical
            ? 'text-amber-300 animate-pulse'
            : warning
            ? 'text-amber-200'
            : 'text-foreground',
        ].join(' ')}
      >
        {String(mins).padStart(2, '0')}:{String(rem).padStart(2, '0')}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <ProgressBar value={pct} />
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
