import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';
import type { DayTask } from '@/types/study-plan';

interface TodayMicroPlanProps {
  tasks: DayTask[];
  onStartTask?: (taskId: string) => void;
  className?: string;
}

export const TodayMicroPlan: React.FC<TodayMicroPlanProps> = ({
  tasks,
  onStartTask,
  className,
}) => {
  if (!tasks.length) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Today's Plan</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} completed
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <div className="rounded-full bg-primary/10 p-1.5">
              <Icon name={task.icon || 'file'} className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>
            {task.completed ? (
              <div className="rounded-full bg-green-100 p-1 dark:bg-green-900">
                <Icon name="check" className="h-4 w-4 text-green-600 dark:text-green-300" />
              </div>
            ) : (
              <Button size="sm" onClick={() => onStartTask?.(task.id)}>
                Start
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};