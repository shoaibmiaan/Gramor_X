import { useMemo } from 'react';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import type { WritingTaskType } from '@/lib/writing/schemas';

const TARGET_MINUTES: Record<WritingTaskType, number> = {
  task1: 20,
  task2: 40,
};

export type TimerBarProps = {
  elapsedMs: number;
  taskType: WritingTaskType;
  paused?: boolean;
};

const formatElapsed = (elapsedMs: number) => {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const TimerBar = ({ elapsedMs, taskType, paused = false }: TimerBarProps) => {
  const targetMinutes = TARGET_MINUTES[taskType];
  const targetMs = targetMinutes * 60000;
  const progress = Math.min(100, Math.round((elapsedMs / targetMs) * 100));
  const status = useMemo(() => {
    if (paused) return 'Paused';
    if (elapsedMs < targetMs * 0.5) return 'On track';
    if (elapsedMs < targetMs * 0.9) return 'Maintain pace';
    if (elapsedMs <= targetMs) return 'Finalise response';
    return 'Time exceeded';
  }, [elapsedMs, paused, targetMs]);

  const tone = paused ? 'default' : elapsedMs <= targetMs ? 'info' : 'warning';

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Timer</p>
        <span className="text-xs font-medium text-muted-foreground">Target {targetMinutes} min</span>
      </div>
      <ProgressBar value={progress} tone={tone} ariaLabel="Elapsed time" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{formatElapsed(elapsedMs)}</span>
        <span>{status}</span>
      </div>
    </div>
  );
};
