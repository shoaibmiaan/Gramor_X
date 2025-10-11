import React, { useMemo } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Checkbox } from '@/components/design-system/Checkbox';
import { Icon } from '@/components/design-system/Icon';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import type { StudyDay, StudyTask } from '@/types/plan';
import { totalMinutesForDay } from '@/utils/studyPlan';
import { useLocale } from '@/lib/locale';

type Props = {
  day: StudyDay;
  onToggleTask: (taskId: string, checked: boolean) => void;
  busyTaskId?: string | null;
  isToday?: boolean;
  nextTaskId?: string | null;
  onStartNextTask?: () => void;
  onTaskRef?: (taskId: string, element: HTMLInputElement | null) => void;
};

function formatDateLabel(dateISO: string, locale: string) {
  const date = new Date(dateISO);
  return new Intl.DateTimeFormat(locale || undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date);
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
  const { t, locale } = useLocale();
  const headerLabel = isToday
    ? t('studyPlan.planCard.today', 'Today')
    : t('studyPlan.planCard.scheduled', 'Scheduled');
  const dateLabel = formatDateLabel(day.dateISO, locale);

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

  const typeBadge = (task: StudyTask) => {
    const variant: React.ComponentProps<typeof Badge>['variant'] =
      task.type === 'mock' ? 'warning'
      : task.type === 'review' ? 'info'
      : task.type === 'rest' ? 'secondary'
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
  };

  return (
    <Card className="rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-small text-muted-foreground">{headerLabel}</p>
          <h3 className="font-slab text-h3 leading-snug">{dateLabel}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-small font-semibold text-primary">
          <Icon name="clock" size={16} aria-hidden />
          <span>{t('studyPlan.planCard.totalMinutes', '{{minutes}} min', { minutes: totalMinutes })}</span>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-small font-medium text-foreground">
            {completedCount}/{totalTasks} {t('studyPlan.planCard.tasksComplete', 'tasks complete')}
          </p>
          <span className="text-small text-muted-foreground">{progress}%</span>
        </div>
        <ProgressBar value={progress} aria-label={t('studyPlan.planCard.aria.progress', 'Daily task completion')} />
      </div>

      {day.tasks.length === 0 ? (
        <p className="mt-6 text-small text-muted-foreground">
          {t('studyPlan.planCard.noTasks', 'No tasks scheduled.')}
        </p>
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
                aria-label={t('studyPlan.planCard.toggleAria', '{{title}} — mark {{state}}', {
                  title: task.title,
                  state: t(
                    task.completed ? 'studyPlan.planCard.state.incomplete' : 'studyPlan.planCard.state.complete',
                    task.completed ? 'incomplete' : 'complete',
                  ),
                })}
                label={
                  <span className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
                    {task.title}
                    {typeBadge(task)}
                  </span>
                }
                description={t(
                  'studyPlan.planCard.estimateWithHint',
                  '{{estimate}} • {{hint}}',
                  {
                    estimate: t('studyPlan.planCard.estimateMinutes', 'Estimated {{minutes}} min', {
                      minutes: task.estMinutes,
                    }),
                    hint: t(
                      task.type === 'rest'
                        ? 'studyPlan.planCard.hints.rest'
                        : 'studyPlan.planCard.hints.focus',
                      task.type === 'rest' ? 'Take a break' : 'Stay focused and complete the task',
                    ),
                  },
                )}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-small text-muted-foreground" aria-live="polite">
          {nextTask
            ? t('studyPlan.planCard.nextUp', 'Next up: {{title}}', { title: nextTask.title })
            : totalTasks > 0
              ? t('studyPlan.planCard.allDone', 'All tasks for this day are complete. Great work!')
              : t('studyPlan.planCard.none', 'No tasks scheduled.')}
        </p>
        <Button onClick={onStartNextTask} disabled={!nextTask} size="sm">
          {nextTask ? t('studyPlan.planCard.startNext', 'Start next task') : t('studyPlan.planCard.nothingLeft', 'Nothing left for today')}
        </Button>
      </div>
    </Card>
  );
};

export default PlanCard;
