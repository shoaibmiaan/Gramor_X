import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';
import type { StudyDay, StudyTask } from '@/types/plan';
import { totalMinutesForDay } from '@/utils/studyPlan';
import { useLocale } from '@/lib/locale';

type Props = {
  day: StudyDay;
  onToggleTask: (taskId: string, checked: boolean) => void;
  busyTaskId?: string | null;
  isToday?: boolean;
};

function formatDateLabel(dateISO: string, locale: string) {
  const date = new Date(dateISO);
  const resolvedLocale = locale === 'ur' ? 'ur-PK' : locale;
  return new Intl.DateTimeFormat(resolvedLocale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function typeBadge(task: StudyTask, translate: typeof import('@/lib/locale').t) {
  const variant: React.ComponentProps<typeof Badge>['variant'] =
    task.type === 'mock'
      ? 'warning'
      : task.type === 'review'
      ? 'info'
      : task.type === 'rest'
      ? 'secondary'
      : 'primary';
  const fallback = task.type.charAt(0).toUpperCase() + task.type.slice(1);
  const label = translate(`studyPlan.tasks.types.${task.type}`, fallback);
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export const PlanCard: React.FC<Props> = ({ day, onToggleTask, busyTaskId, isToday }) => {
  const { t, locale } = useLocale();
  const totalMinutes = totalMinutesForDay(day);
  const minutesLabel = t('studyPlan.planCard.totalMinutes', undefined, { minutes: totalMinutes });
  return (
    <Card className="rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-small text-muted-foreground">
            {isToday ? t('studyPlan.planCard.today') : t('studyPlan.planCard.scheduled')}
          </p>
          <h3 className="font-slab text-h3 leading-snug">{formatDateLabel(day.dateISO, locale)}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small font-semibold text-primary">
          <Icon name="clock" size={16} aria-hidden />
          <span>{minutesLabel}</span>
        </div>
      </div>

      {day.tasks.length === 0 ? (
        <p className="mt-6 text-small text-muted-foreground">{t('studyPlan.planCard.empty')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {day.tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 rounded-2xl border border-border/60 p-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => onToggleTask(task.id, Boolean(checked))}
                disabled={busyTaskId === task.id}
                aria-label={t('studyPlan.planCard.toggleLabel', undefined, {
                  title: task.title,
                  state: task.completed
                    ? t('studyPlan.planCard.state.incomplete')
                    : t('studyPlan.planCard.state.complete'),
                })}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-medium text-foreground">{task.title}</span>
                  {typeBadge(task, t)}
                </div>
                <p className="text-small text-muted-foreground">
                  {t('studyPlan.planCard.estimate', undefined, {
                    minutes: task.estMinutes,
                    detail:
                      task.type === 'rest'
                        ? t('studyPlan.planCard.detail.rest')
                        : t('studyPlan.planCard.detail.focus'),
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default PlanCard;
