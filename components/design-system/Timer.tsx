import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from 'clsx';

export type TimerMode = "countdown" | "stopwatch";

export type TimerProps = {
  /** Seconds to start from (for countdown) or 0 for stopwatch */
  initialSeconds?: number;
  mode?: TimerMode;
  running?: boolean;
  onTick?: (seconds: number) => void;
  onComplete?: () => void; // fires when countdown reaches 0
  className?: string;
  ariaLabel?: string;
};

function format(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

export const Timer: React.FC<TimerProps> = ({
  initialSeconds = 0,
  mode = "countdown",
  running = true,
  onTick,
  onComplete,
  className = "",
  ariaLabel = "Timer",
}) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!running) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
      return;
    }

    const loop = (t: number) => {
      if (last.current == null) last.current = t;
      const dt = (t - last.current) / 1000;
      last.current = t;

      setSeconds((prev) => {
        const next = mode === "countdown" ? prev - dt : prev + dt;
        onTick?.(next);
        if (mode === "countdown" && next <= 0) {
          onComplete?.();
          return 0;
        }
        return next;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
    };
  }, [running, mode, onTick, onComplete]);

  const label = useMemo(() => format(seconds), [seconds]);

  const intent =
    mode === "countdown" && seconds <= 60
      ? 'text-warn'
      : 'text-text';

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex items-center gap-sm rounded-ds-xl border border-border bg-panel/80 px-sm py-2xs shadow-sm',
        className
      )}
    >
      <i className={clsx('fas fa-clock', intent)} aria-hidden="true" />
      <span className={clsx('tabular-nums font-semibold', intent)}>{label}</span>
    </div>
  );
};
