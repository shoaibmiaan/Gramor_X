import React, { useMemo } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Icon } from '@/components/design-system/Icon';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import type { StudyDay, StudyTask } from '@/types/plan';
import { totalMinutesForDay } from '@/utils/studyPlan';

type Props = {
  day: StudyDay;
  onToggleTask: (taskId: string, checked: boolean) => void;
  busyTaskId?: string | null;
  isToday?: boolean;
  nextTaskId?: string | null;
  onStartNextTask?: () => void;
  onTaskRef?: (taskId: string, element: HTMLInputElement | null) => void;
};

function formatDateLabel(dateISO: string) {
  const date = new Date(dateISO);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function typeBadge(task: StudyTask) {
  const label = task.type.charAt(0).toUpperCase() + task.type.slice(1);
  const variant: React.ComponentProps<typeof Badge>['variant'] =
    task.type === 'mock'
      ? 'warning'
      : task.type === 'review'
      ? 'info'
      : task.type === 'rest'
      ? 'secondary'
      : 'primary';
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export const PlanCard: React.FC<Props> = ({
  day,
  onToggleTask,
  busyTaskId,
  isToday,
  nextTaskId,
  onStartNextTask,
  onTaskRef,
}) => {
  const totalMinutes = totalMinutesForDay(day);
  const { completedCount, totalTasks, progress } = useMemo(() => {
    const total = day.tasks.length;
    const completed = day.tasks.filter((task) => task.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedCount: completed, totalTasks: total, progress: pct };
  }, [day.tasks]);

  const nextTask = useMemo(() => {
    if (!nextTaskId) return null;
    return day.tasks.find((task) => task.id === nextTaskId) ?? null;
  }, [day.tasks, nextTaskId]);

  return (
    <Card className="rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-small text-muted-foreground">{isToday ? 'Today' : 'Scheduled'}</p>
          <h3 className="font-slab text-h3 leading-snug">{formatDateLabel(day.dateISO)}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small font-semibold text-primary">
          <Icon name="clock" size={16} aria-hidden />
          <span>{totalMinutes} min</span>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-small font-medium text-foreground">
            {completedCount}/{totalTasks} tasks complete
          </p>
          <span className="text-small text-muted-foreground">{progress}%</span>
        </div>
        <ProgressBar value={progress} aria-label="Daily task completion" />
      </div>

      {day.tasks.length === 0 ? (
        <p className="mt-6 text-small text-muted-foreground">No tasks scheduled for this day.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {day.tasks.map((task) => (
            <li
              key={task.id}
              className={`rounded-2xl border border-border/60 bg-card/70 p-4 transition-colors ${
                nextTaskId === task.id ? 'border-primary/70 bg-primary/5' : ''
              }`}
              aria-current={nextTaskId === task.id ? 'step' : undefined}
            >
              <Checkbox
                ref={(element) => onTaskRef?.(task.id, element)}
                checked={task.completed}
                onCheckedChange={(checked) => onToggleTask(task.id, Boolean(checked))}
                disabled={busyTaskId === task.id}
                label={
                  <span className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
                    {task.title}
                    {typeBadge(task)}
                  </span>
                }
                description={`Estimated ${task.estMinutes} min • ${
                  task.type === 'rest' ? 'Take a break' : 'Stay focused and complete the task'
                }`}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-muted-foreground" aria-live="polite">
          {nextTask
            ? `Next up: ${nextTask.title}`
            : totalTasks > 0
            ? 'All tasks for this day are complete. Great work!'
            : 'No tasks scheduled.'}
        </p>
        <Button onClick={onStartNextTask} disabled={!nextTask} size="sm">
          {nextTask ? 'Start next task' : 'Nothing left for today'}
        </Button>
      </div>
    </Card>
  );
};

export default PlanCard;
