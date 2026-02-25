import clsx from 'clsx';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import type { WritingTaskType } from '@/lib/writing/schemas';

const TASK_TARGETS: Record<WritingTaskType, { minimum: number; idealMin: number; idealMax: number; ceiling: number }> = {
  task1: { minimum: 150, idealMin: 150, idealMax: 170, ceiling: 220 },
  task2: { minimum: 250, idealMin: 250, idealMax: 290, ceiling: 360 },
};

export type WordCountBarProps = {
  taskType: WritingTaskType;
  wordCount: number;
};

const statusLabel = (taskType: WritingTaskType, wordCount: number) => {
  const { minimum, idealMin, idealMax } = TASK_TARGETS[taskType];
  if (wordCount === 0) return 'Start drafting';
  if (wordCount < minimum) return `Below minimum (${minimum})`;
  if (wordCount >= idealMin && wordCount <= idealMax) return 'Within ideal band';
  if (wordCount > idealMax) return 'Consider tightening';
  return 'Keep developing ideas';
};

const toneForCount = (taskType: WritingTaskType, wordCount: number): 'default' | 'success' | 'warning' | 'danger' => {
  const { minimum, idealMin, idealMax, ceiling } = TASK_TARGETS[taskType];
  if (wordCount === 0) return 'default';
  if (wordCount < minimum) return 'warning';
  if (wordCount >= idealMin && wordCount <= idealMax) return 'success';
  if (wordCount > ceiling) return 'danger';
  return 'warning';
};

export const WordCountBar = ({ taskType, wordCount }: WordCountBarProps) => {
  const { ceiling, idealMin, idealMax } = TASK_TARGETS[taskType];
  const progress = Math.min(100, Math.round((wordCount / ceiling) * 100));
  const withinIdeal = wordCount >= idealMin && wordCount <= idealMax;

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Word count</p>
        <span className={clsx('text-xs font-medium', withinIdeal ? 'text-success' : 'text-muted-foreground')}>
          {wordCount} words
        </span>
      </div>
      <ProgressBar value={progress} tone={toneForCount(taskType, wordCount)} ariaLabel="Word count progress" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Target range{' '}
          <span className="font-semibold text-foreground">
            {TASK_TARGETS[taskType].idealMin}–{TASK_TARGETS[taskType].idealMax}
          </span>
        </span>
        <span>{statusLabel(taskType, wordCount)}</span>
      </div>
    </div>
  );
};
