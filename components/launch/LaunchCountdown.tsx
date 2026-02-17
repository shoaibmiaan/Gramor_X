// components/launch/LaunchCountdown.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { getRemainingTimeParts } from '@/lib/time/remaining';

const DEFAULT_LABELS = ['Days', 'Hours', 'Minutes', 'Seconds'] as const;

export type LaunchCountdownProps = {
  /** Server time (UTC ms) at render, used as a stable baseline */
  serverNowMsUTC: number;
  /** Target launch time (UTC ms) */
  launchMsUTC: number;
  /** Tick interval in ms (defaults to 1000) */
  tickMs?: number;
  /** Extra classes for the outer flex container */
  className?: string;
  /** Optional custom labels — must be length 4 if provided */
  labels?: readonly string[];
};

/**
 * LaunchCountdown
 *
 * Used on the marketing hero to show time remaining until a launch / cohort date.
 * This component:
 * - Starts from an SSR-safe baseline (serverNowMsUTC)
 * - Ticks on the client at `tickMs` interval
 * - Clamps negative values to zero and exposes “live” state
 */
export const LaunchCountdown: React.FC<LaunchCountdownProps> = ({
  serverNowMsUTC,
  launchMsUTC,
  tickMs = 1000,
  className,
  labels = DEFAULT_LABELS,
}) => {
  const [nowMsUTC, setNowMsUTC] = useState<number>(serverNowMsUTC);

  // Guard against weird labels array
  const safeLabels = useMemo(() => {
    if (!Array.isArray(labels) || labels.length !== 4) {
      return DEFAULT_LABELS;
    }
    return labels as readonly string[];
  }, [labels]);

  useEffect(() => {
    // If launch is already in the past, no need to tick
    if (serverNowMsUTC >= launchMsUTC) {
      setNowMsUTC(serverNowMsUTC);
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      if (cancelled) return;
      setNowMsUTC((prev) => {
        const next = prev + tickMs;
        return Number.isFinite(next) ? next : prev;
      });
    }, tickMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [serverNowMsUTC, launchMsUTC, tickMs]);

  const parts = useMemo(
    () =>
      getRemainingTimeParts({
        targetMsUTC: launchMsUTC,
        nowMsUTC,
      }),
    [launchMsUTC, nowMsUTC],
  );

  const { days, hours, minutes, seconds, isPast, clampedMs } = parts;

  const values: number[] = [days, hours, minutes, seconds];

  const isLive = isPast || clampedMs <= 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Number blocks */}
      <div
        className={clsx(
          'flex flex-wrap justify-center gap-4 sm:gap-6',
          className,
        )}
        aria-live="polite"
      >
        {safeLabels.map((label, index) => (
          <div key={label} className="min-w-[5.5rem] text-center">
            <div
              className={clsx(
                'font-slab text-3xl sm:text-4xl md:text-5xl font-bold',
                isLive
                  ? 'text-success'
                  : 'text-gradient-vertical',
              )}
            >
              {String(values[index] ?? 0).padStart(2, '0')}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Status line */}
      <p className="text-[11px] text-muted-foreground text-center">
        {isLive
          ? 'We are now live — new learners are being onboarded.'
          : 'Time left until the next cohort window opens.'}
      </p>
    </div>
  );
};

export default LaunchCountdown;
