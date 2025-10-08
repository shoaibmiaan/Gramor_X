import React from 'react';
import { Card } from '@/components/design-system/Card';
import type { StudyDay } from '@/types/plan';
import { planDayKey, totalMinutesForDay } from '@/utils/studyPlan';

type Props = {
  days: StudyDay[];
};

function formatDay(dateISO: string) {
  const date = new Date(dateISO);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const WeekGrid: React.FC<Props> = ({ days }) => {
  if (days.length === 0) {
    return (
      <Card className="rounded-ds-2xl p-6 text-small text-muted-foreground">
        Upcoming study days will appear here once your plan starts.
      </Card>
    );
  }

  return (
    <Card className="rounded-ds-2xl p-6">
      <h3 className="font-slab text-h4">Next 7 days</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {days.map((day) => {
          const completed = day.tasks.filter((task) => task.completed).length;
          const total = day.tasks.length;
          const key = planDayKey(day);
          return (
            <div
              key={key}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
            >
              <p className="text-small text-muted-foreground">{formatDay(day.dateISO)}</p>
              <p className="text-body font-semibold text-foreground">{completed}/{total} tasks complete</p>
              <p className="text-small text-muted-foreground">{totalMinutesForDay(day)} min planned</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WeekGrid;
