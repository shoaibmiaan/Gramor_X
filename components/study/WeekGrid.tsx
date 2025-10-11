import React from 'react';
import { Card } from '@/components/design-system/Card';
import type { StudyDay } from '@/types/plan';
import { planDayKey, totalMinutesForDay } from '@/utils/studyPlan';
import { useLocale } from '@/lib/locale';

type Props = {
  days: StudyDay[];
};

function formatDay(dateISO: string, locale: string) {
  const date = new Date(dateISO);
  const resolvedLocale = locale === 'ur' ? 'ur-PK' : locale;
  return new Intl.DateTimeFormat(resolvedLocale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const WeekGrid: React.FC<Props> = ({ days }) => {
  const { t, locale } = useLocale();
  if (days.length === 0) {
    return (
      <Card className="rounded-ds-2xl p-6 text-small text-muted-foreground">
        {t('studyPlan.weekGrid.empty')}
      </Card>
    );
  }

  return (
    <Card className="rounded-ds-2xl p-6">
      <h3 className="font-slab text-h4">{t('studyPlan.weekGrid.title')}</h3>
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
              <p className="text-small text-muted-foreground">{formatDay(day.dateISO, locale)}</p>
              <p className="text-body font-semibold text-foreground">
                {t('studyPlan.weekGrid.progress', undefined, { completed, total })}
              </p>
              <p className="text-small text-muted-foreground">
                {t('studyPlan.weekGrid.minutesPlanned', undefined, {
                  minutes: totalMinutesForDay(day),
                })}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WeekGrid;
