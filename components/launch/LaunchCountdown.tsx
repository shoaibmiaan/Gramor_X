'use client';

import React from 'react';
import clsx from 'clsx';
import { getRemainingTimeParts } from '@/lib/time/remaining';

const DEFAULT_LABELS = ['Days', 'Hours', 'Minutes', 'Seconds'] as const;

export type LaunchCountdownProps = {
  serverNowMsUTC: number;
  launchMsUTC: number;
  tickMs?: number;
  className?: string;
  labels?: readonly string[];
};

export const LaunchCountdown: React.FC<LaunchCountdownProps> = ({
  serverNowMsUTC,
  launchMsUTC,
  tickMs = 1000,
  className,
  labels = DEFAULT_LABELS,
}) => {
  const [nowMs, setNowMs] = React.useState(serverNowMsUTC);

  React.useEffect(() => {
    const clientStart = Date.now();

    const update = () => {
      const elapsed = Date.now() - clientStart;
      setNowMs(serverNowMsUTC + elapsed);
    };

    update();

    if (tickMs <= 0) return undefined;

    const id = window.setInterval(update, tickMs);
    return () => window.clearInterval(id);
  }, [serverNowMsUTC, tickMs]);

  const remaining = React.useMemo(
    () => getRemainingTimeParts({ targetMsUTC: launchMsUTC, nowMsUTC: nowMs }),
    [launchMsUTC, nowMs]
  );

  const values = [remaining.days, remaining.hours, remaining.minutes, remaining.seconds];

  return (
    <div className={clsx('flex flex-wrap justify-center gap-4 sm:gap-6', className)} aria-live="polite">
      {labels.map((label, index) => (
        <div key={label} className="min-w-[5.5rem] text-center">
          <div className="font-slab text-4xl font-bold text-gradient-vertical sm:text-5xl">
            {String(values[index] ?? 0).padStart(2, '0')}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
};

export default LaunchCountdown;
