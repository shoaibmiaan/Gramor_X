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
  return new Intl.DateTimeFormat(locale || undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const PlanCard: React.FC<Props> = ({ day, onToggleTask, busyTaskId, isToday }) => {
  const totalMinutes = totalMinutesForDay(day);
  const { t, locale } = useLocale();
  const headerLabel = isToday ? t('studyPlan.planCard.today') : t('studyPlan.planCard.scheduled');
  const dateLabel = formatDateLabel(day.dateISO, locale);
  return (
    <Card className="rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-small text-muted-foreground">{headerLabel}</p>
          <h3 className="font-slab text-h3 leading-snug">{dateLabel}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small font-semibold text-primary">
          <Icon name="clock" size={16} aria-hidden />
          <span>{t('studyPlan.planCard.totalMinutes', { minutes: totalMinutes })}</span>
        </div>
      </div>

      {day.tasks.length === 0 ? (
        <p className="mt-6 text-small text-muted-foreground">{t('studyPlan.planCard.noTasks')}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {day.tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 rounded-2xl border border-border/60 p-4">
              <Checkbox
                checked={task.completed}
                onCheckedChange={(checked) => onToggleTask(task.id, Boolean(checked))}
                disabled={busyTaskId === task.id}
                aria-label={t('studyPlan.planCard.toggleAria', {
                  title: task.title,
                  state: t(
                    task.completed
                      ? 'studyPlan.planCard.state.incomplete'
                      : 'studyPlan.planCard.state.complete',
                  ),
                })}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body font-medium text-foreground">{task.title}</span>
                  {(() => {
                    const variant: React.ComponentProps<typeof Badge>['variant'] =
                      task.type === 'mock'
                        ? 'warning'
                        : task.type === 'review'
                          ? 'info'
                          : task.type === 'rest'
                            ? 'secondary'
                            : 'primary';
                    const label = t(
                      `studyPlan.planCard.taskType.${task.type}`,
                      task.type.charAt(0).toUpperCase() + task.type.slice(1),
                    );
                    return (
                      <Badge variant={variant} size="sm">
                        {label}
                      </Badge>
                    );
                  })()}
                </div>
                {(() => {
                  const estimate = t('studyPlan.planCard.estimateMinutes', { minutes: task.estMinutes });
                  const hint = t(
                    task.type === 'rest'
                      ? 'studyPlan.planCard.hints.rest'
                      : 'studyPlan.planCard.hints.focus',
                  );
                  return (
                    <p className="text-small text-muted-foreground">
                      {t('studyPlan.planCard.estimateWithHint', { estimate, hint })}
                    </p>
                  );
                })()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default PlanCard;
