import React from 'react';
import clsx from 'clsx';

import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Countdown } from '@/components/timers/Countdown';

interface EditorStatusBarProps {
  task1Count: number;
  task2Count: number;
  minTask1: number;
  minTask2: number;
  defaultTimerMinutes?: number;
}

const formatTime = (remainingMs: number) => {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const statusVariant = (count: number, minimum: number) => {
  if (count === 0) return 'neutral';
  return count >= minimum ? 'success' : 'warning';
};

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  task1Count,
  task2Count,
  minTask1,
  minTask2,
  defaultTimerMinutes = 40,
}) => {
  const [timerVisible, setTimerVisible] = React.useState(false);
  const [timerExpired, setTimerExpired] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const warningRef = React.useRef<number | null>(null);
  const total = task1Count + task2Count;
  const safeMinutes = Math.max(1, defaultTimerMinutes);
  const durationMs = safeMinutes * 60 * 1000;

  const handleTick = React.useCallback((remainingMs: number) => {
    if (remainingMs <= 0) return;
    const minutes = Math.ceil(remainingMs / 60000);
    if ([10, 5, 1].includes(minutes) && warningRef.current !== minutes) {
      warningRef.current = minutes;
      setAnnouncement(`Only ${minutes} minute${minutes === 1 ? '' : 's'} remaining.`);
    }
  }, []);

  const handleExpire = React.useCallback(() => {
    setTimerExpired(true);
    setAnnouncement('Time is up.');
  }, []);

  const resetTimer = React.useCallback(
    (reset: (nextDurationMs?: number) => void) => {
      warningRef.current = null;
      setTimerExpired(false);
      reset(durationMs);
      setAnnouncement(`Timer reset to ${safeMinutes} minutes.`);
    },
    [durationMs, safeMinutes],
  );

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-ds-xl border border-border/80 bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge size="sm" variant={statusVariant(task1Count, minTask1)}>
          Task 1: {task1Count} words
        </Badge>
        <Badge size="sm" variant={statusVariant(task2Count, minTask2)}>
          Task 2: {task2Count} words
        </Badge>
        <Badge size="sm" variant="neutral">
          Total: {total} words
        </Badge>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        {timerVisible ? (
          <Countdown
            key={defaultTimerMinutes}
            durationMs={durationMs}
            autoStart
            onTick={handleTick}
            onExpire={handleExpire}
          >
            {({ remainingMs, isRunning, start, pause, reset }) => (
              <div className="flex items-center gap-3">
                <span
                  className={clsx('font-mono text-small', timerExpired ? 'text-warning' : 'text-muted-foreground')}
                  aria-live="polite"
                >
                  {timerExpired ? '00:00' : formatTime(remainingMs)}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (timerExpired) {
                      resetTimer(reset);
                      start();
                      setAnnouncement('Timer restarted.');
                      return;
                    }
                    if (isRunning) {
                      pause();
                      setAnnouncement('Timer paused.');
                    } else {
                      start();
                      setAnnouncement('Timer resumed.');
                    }
                  }}
                >
                  {timerExpired ? 'Restart' : isRunning ? 'Pause' : 'Resume'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    resetTimer(reset);
                    setAnnouncement('Timer cleared.');
                    setTimerVisible(false);
                  }}
                >
                  Cancel timer
                </Button>
              </div>
            )}
          </Countdown>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              warningRef.current = null;
              setTimerExpired(false);
              setTimerVisible(true);
              setAnnouncement(`Timer started for ${safeMinutes} minutes.`);
            }}
          >
            Start {safeMinutes}-minute timer
          </Button>
        )}
      </div>

      <span className="sr-only" aria-live="assertive">
        {announcement}
      </span>
    </div>
  );
};

export default EditorStatusBar;
