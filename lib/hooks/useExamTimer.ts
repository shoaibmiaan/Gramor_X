// lib/hooks/useExamTimer.ts
// Lightweight countdown timer hook shared across exam experiences.

import { useCallback, useEffect, useRef, useState } from 'react';

export type UseExamTimerOptions = {
  autoStart?: boolean;
  onFinish?: () => void;
};

export type UseExamTimerResult = {
  timeLeft: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (seconds?: number) => void;
  percentComplete: number;
};

export const useExamTimer = (durationSeconds: number, options: UseExamTimerOptions = {}): UseExamTimerResult => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(Boolean(options.autoStart));
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    setTimeLeft(durationSeconds);
    if (options.autoStart) {
      setIsRunning(true);
      startedAtRef.current = Date.now();
    } else {
      setIsRunning(false);
      startedAtRef.current = null;
    }
  }, [durationSeconds, options.autoStart]);

  useEffect(() => {
    if (!isRunning) return;
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now() - (durationSeconds - timeLeft) * 1000;
    }
    const tick = () => {
      if (!startedAtRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      const remaining = Math.max(0, durationSeconds - elapsed);
      setTimeLeft(Math.round(remaining));
      if (remaining <= 0) {
        setIsRunning(false);
        options.onFinish?.();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [durationSeconds, isRunning, options]);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    pausedAtRef.current = null;
    setTimeLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    pausedAtRef.current = Date.now();
    setIsRunning(false);
  }, [isRunning]);

  const resume = useCallback(() => {
    if (isRunning || timeLeft <= 0) return;
    const pausedAt = pausedAtRef.current ?? Date.now();
    const elapsedWhilePaused = Date.now() - pausedAt;
    startedAtRef.current = Date.now() - (durationSeconds - timeLeft) * 1000 - elapsedWhilePaused;
    setIsRunning(true);
  }, [durationSeconds, isRunning, timeLeft]);

  const reset = useCallback(
    (seconds?: number) => {
      const next = typeof seconds === 'number' ? seconds : durationSeconds;
      setTimeLeft(next);
      setIsRunning(false);
      startedAtRef.current = null;
      pausedAtRef.current = null;
    },
    [durationSeconds],
  );

  const percentComplete = Math.min(1, Math.max(0, 1 - timeLeft / durationSeconds));

  return { timeLeft, isRunning, start, pause, resume, reset, percentComplete };
};
