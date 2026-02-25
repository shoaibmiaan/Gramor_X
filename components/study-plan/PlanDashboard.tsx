import React from 'react';
import { Card } from '@/components/design-system/Card';
import { TimelineStrip } from './TimelineStrip';
import { TodayMicroPlan } from './TodayMicroPlan';
import { AIRecommendationWidget } from './AIRecommendationWidget';
import { SkillGauges } from './SkillGauges';
import { FirstLessonButton } from './FirstLessonButton';
import { cn } from '@/lib/utils';
import type { StudyPlan, Week, DayTask, SkillScore, AIRecommendation } from '@/types/study-plan';

interface PlanDashboardProps {
  plan: StudyPlan;
  todayTasks?: DayTask[];
  skillScores: SkillScore[];
  recommendations?: AIRecommendation[];
  onStartLesson?: (taskId: string) => void;
  onViewWeek?: (weekId: string) => void;
  loading?: boolean;
  className?: string;
}

export const PlanDashboard: React.FC<PlanDashboardProps> = ({
  plan,
  todayTasks,
  skillScores,
  recommendations = [],
  onStartLesson,
  onViewWeek,
  loading = false,
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card className="p-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-20 w-full animate-pulse rounded bg-muted" />
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-40 animate-pulse bg-muted" />
          <Card className="h-40 animate-pulse bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with plan summary and first lesson button */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Your Study Plan</h2>
          <p className="text-sm text-muted-foreground">
            Target Band {plan.targetBand} · {plan.totalWeeks} weeks · {plan.daysPerWeek} days/week
          </p>
        </div>
        <FirstLessonButton
          onClick={() => onStartLesson?.(plan.firstTaskId || '')}
          disabled={!plan.firstTaskId}
        />
      </div>

      {/* Today's micro-plan */}
      {todayTasks && todayTasks.length > 0 && (
        <TodayMicroPlan tasks={todayTasks} onStartTask={onStartLesson} />
      )}

      {/* Timeline strip */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">Your Journey</h3>
        <TimelineStrip weeks={plan.weeks} onWeekClick={onViewWeek} />
      </div>

      {/* Two-column layout for widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Recommendations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            AI Insights
          </h3>
          <div className="space-y-2">
            {recommendations.length > 0 ? (
              recommendations.map((rec, idx) => (
                <AIRecommendationWidget key={idx} {...rec} />
              ))
            ) : (
              <Card className="p-4 text-center text-sm text-muted-foreground">
                No recommendations yet. Keep practicing!
              </Card>
            )}
          </div>
        </div>

        {/* Skill progress */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progress to Target
          </h3>
          <SkillGauges skills={skillScores} />
        </div>
      </div>
    </div>
  );
};