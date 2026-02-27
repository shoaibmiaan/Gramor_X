import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/design-system/Card';
import type { Week } from '@/types/study-plan';

interface TimelineStripProps {
  weeks: Week[];
  onWeekClick?: (weekId: string) => void;
  className?: string;
}

export const TimelineStrip: React.FC<TimelineStripProps> = ({
  weeks,
  onWeekClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted',
        className
      )}
    >
      {weeks.map((week, index) => {
        const isCurrent = week.isCurrent; // boolean indicating if this is the current week
        const completedTasks = week.tasks?.filter((t) => t.completed).length || 0;
        const totalTasks = week.tasks?.length || 0;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        return (
          <Card
            key={week.id}
            className={cn(
              'min-w-[180px] cursor-pointer p-4 transition-all hover:border-primary',
              isCurrent && 'border-primary bg-primary/5'
            )}
            onClick={() => onWeekClick?.(week.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Week {week.number}</span>
              {isCurrent && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Current
                </span>
              )}
            </div>
            {week.focus && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{week.focus}</p>
            )}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};