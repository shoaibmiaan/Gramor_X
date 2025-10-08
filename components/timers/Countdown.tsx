import React from 'react';

export interface CountdownRenderProps {
  remainingMs: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (nextDurationMs?: number) => void;
}

export interface CountdownProps {
  durationMs: number;
  autoStart?: boolean;
  intervalMs?: number;
  onTick?: (remainingMs: number) => void;
  onExpire?: () => void;
  children: (props: CountdownRenderProps) => React.ReactNode;
}

export const Countdown: React.FC<CountdownProps> = ({
  durationMs,
  autoStart = false,
  intervalMs = 1000,
  onTick,
  onExpire,
  children,
}) => {
  const [remaining, setRemaining] = React.useState(durationMs);
  const [running, setRunning] = React.useState(autoStart);
  const endTimeRef = React.useRef<number | null>(autoStart ? Date.now() + durationMs : null);
  const remainingRef = React.useRef(durationMs);

  React.useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  React.useEffect(() => {
    remainingRef.current = durationMs;
    setRemaining(durationMs);
    if (autoStart) {
      endTimeRef.current = Date.now() + durationMs;
      setRunning(true);
    } else {
      endTimeRef.current = null;
      setRunning(false);
    }
  }, [durationMs, autoStart]);

  React.useEffect(() => {
    if (!running) return;
    if (typeof window === 'undefined') return;

    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + remainingRef.current;
    }

    const tick = () => {
      const now = Date.now();
      const endTime = endTimeRef.current ?? now;
      const next = Math.max(0, endTime - now);
      setRemaining(next);
      remainingRef.current = next;
      onTick?.(next);
      if (next === 0) {
        endTimeRef.current = null;
        setRunning(false);
        onExpire?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(interval);
  }, [running, intervalMs, onTick, onExpire]);

  const start = React.useCallback(() => {
    if (running) return;
    endTimeRef.current = Date.now() + remainingRef.current;
    setRunning(true);
  }, [running]);

  const pause = React.useCallback(() => {
    if (!running) return;
    const now = Date.now();
    if (endTimeRef.current !== null) {
      const next = Math.max(0, endTimeRef.current - now);
      remainingRef.current = next;
      setRemaining(next);
    }
    endTimeRef.current = null;
    setRunning(false);
  }, [running]);

  const reset = React.useCallback(
    (nextDurationMs?: number) => {
      const next = typeof nextDurationMs === 'number' ? nextDurationMs : durationMs;
      remainingRef.current = next;
      setRemaining(next);
      if (autoStart) {
        endTimeRef.current = Date.now() + next;
        setRunning(true);
      } else {
        endTimeRef.current = null;
        setRunning(false);
      }
    },
    [autoStart, durationMs],
  );

  return <>{children({ remainingMs: remaining, isRunning: running, start, pause, reset })}</>;
};

export default Countdown;
