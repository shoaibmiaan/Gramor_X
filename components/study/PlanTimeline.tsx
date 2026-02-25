import React from 'react';

import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import type { StudyDay } from '@/types/plan';
import { planDayKey, totalMinutesForDay } from '@/utils/studyPlan';

type Props = {
  days: StudyDay[];
  todayKey: string;
};

function formatDayLabel(dateISO: string) {
  const date = new Date(dateISO);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const PlanTimeline: React.FC<Props> = ({ days, todayKey }) => {
  if (!days.length) {
    return (
      <Card className="rounded-ds-2xl p-6 text-small text-muted-foreground">
        Upcoming study days will appear here once your plan starts.
      </Card>
    );
  }

  return (
    <Card className="rounded-ds-2xl p-6">
      <h3 className="font-slab text-h4">Plan timeline</h3>
      <ol className="mt-6 space-y-6">
        {days.map((day, index) => {
          const completed = day.tasks.filter((task) => task.completed).length;
          const total = day.tasks.length;
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isToday = planDayKey(day) === todayKey;
          const minutes = totalMinutesForDay(day);

          return (
            <li key={planDayKey(day)} className="grid grid-cols-[auto_1fr] gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-3 w-3 rounded-full border ${
                    isToday ? 'border-primary bg-primary' : 'border-border bg-card'
                  }`}
                  aria-hidden
                />
                {index < days.length - 1 && <span className="mt-1 w-px flex-1 bg-border/60" aria-hidden />}
              </div>
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-small font-medium text-foreground">
                      {isToday ? 'Today' : formatDayLabel(day.dateISO)}
                    </p>
                    <p className="text-small text-muted-foreground">
                      {completed}/{total} tasks • {minutes} min planned
                    </p>
                  </div>
                  <span className="text-small text-muted-foreground">{progress}%</span>
                </div>
                <ProgressBar value={progress} aria-label={`Progress for ${formatDayLabel(day.dateISO)}`} />
                <ul className="space-y-1 text-small text-muted-foreground">
                  {day.tasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          task.completed ? 'bg-primary' : 'bg-border/60'
                        }`}
                        aria-hidden
                      />
                      <span className={task.completed ? 'line-through opacity-70' : undefined}>{task.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};

export default PlanTimeline;
