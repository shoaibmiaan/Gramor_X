import React, { useMemo } from 'react';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import type { IconName } from '@/components/design-system/Icon';

export interface GoalRoadmapProps {
  examDate?: string | null;
}

type StageKey = 'Foundation' | 'Practice' | 'Review';

type StageMeta = {
  icon: IconName;
  description: string;
  focus: string[];
  gradient: string;
};

const STAGE_META: Record<StageKey, StageMeta> = {
  Foundation: {
    icon: 'BookOpen',
    description: 'Rebuild grammar, vocabulary, and essay frameworks so every response has structure.',
    focus: ['Grammar reboot', 'Vocabulary sprints', 'Strategy briefings'],
    gradient: 'from-amber-400 to-orange-500',
  },
  Practice: {
    icon: 'Timer',
    description: 'Simulate the test each week with timed drills, instant scoring, and band tracking.',
    focus: ['Timed section drills', 'AI score loops', 'Weekly mock'],
    gradient: 'from-electricBlue to-purpleVibe',
  },
  Review: {
    icon: 'Sparkles',
    description: 'Polish weak spots, revisit mistakes, and rehearse exam-day rituals for calm execution.',
    focus: ['Error log sweeps', 'Speaking feedback', 'Mindset rituals'],
    gradient: 'from-neonGreen to-emerald-400',
  },
};

const STAGE_ORDER: StageKey[] = ['Foundation', 'Practice', 'Review'];
const MS_IN_DAY = 1000 * 60 * 60 * 24;
const MS_IN_WEEK = MS_IN_DAY * 7;

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const buildPlan = (examDate?: string | null) => {
  if (!examDate) return null;
  const exam = new Date(examDate);
  if (Number.isNaN(exam.getTime())) return null;

  const now = new Date();
  if (exam <= now) return null;

  const diffMs = exam.getTime() - now.getTime();
  const totalWeeks = Math.max(1, Math.ceil(diffMs / MS_IN_WEEK));
  const totalDays = Math.max(1, Math.ceil(diffMs / MS_IN_DAY));

  let foundation = Math.max(1, Math.round(totalWeeks * 0.35));
  let practice = Math.max(1, Math.round(totalWeeks * 0.45));
  let review = Math.max(1, totalWeeks - foundation - practice);

  let allocated = foundation + practice + review;
  while (allocated > totalWeeks) {
    if (practice > 1) {
      practice -= 1;
    } else if (foundation > 1) {
      foundation -= 1;
    } else if (review > 1) {
      review -= 1;
    } else {
      break;
    }
    allocated = foundation + practice + review;
  }

  if (allocated < totalWeeks) {
    review += totalWeeks - allocated;
  }

  const stages = STAGE_ORDER.map((key) => {
    const weeks = key === 'Foundation' ? foundation : key === 'Practice' ? practice : review;
    return { key, weeks } as const;
  });

  // Keep 'today' so timeline can anchor correctly
  return { exam, totalWeeks, totalDays, stages, today: now } as const;
};

export const GoalRoadmap: React.FC<GoalRoadmapProps> = ({ examDate }) => {
  const plan = useMemo(() => buildPlan(examDate), [examDate]);

  // Expanded timeline computation (kept from codex branch)
  const timeline = useMemo(() => {
    if (!plan)
      return [] as Array<{
        key: StageKey;
        start: Date;
        end: Date;
        isActive: boolean;
        isComplete: boolean;
      }>;

    let weekCursor = 0;

    return plan.stages.map((stage, index) => {
      const projectedStart = new Date(plan.today.getTime() + weekCursor * MS_IN_WEEK);
      const start = projectedStart.getTime() > plan.exam.getTime() ? plan.exam : projectedStart;
      const rawEnd = new Date(start.getTime() + stage.weeks * MS_IN_WEEK);
      weekCursor += stage.weeks;

      const unclampedEnd = index === plan.stages.length - 1 ? plan.exam : rawEnd;
      const end = unclampedEnd.getTime() < start.getTime() ? start : unclampedEnd;
      const todayTime = plan.today.getTime();
      const isComplete = todayTime > end.getTime();
      const isActive = !isComplete && todayTime >= start.getTime();

      return { key: stage.key, start, end, isActive, isComplete };
    });
  }, [plan]);

  const currentStage = useMemo(
    () => timeline.find((stage) => stage.isActive) ?? timeline.find((stage) => !stage.isComplete),
    [timeline]
  );

  const formatRange = (start: Date, end: Date) => {
    if (start.toDateString() === end.toDateString()) return formatDate(start);

    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameMonth && sameYear) {
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, {
        day: 'numeric',
      })}`;
    }

    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  if (!plan) {
    return (
      <Card className="rounded-ds-2xl p-6">
        <h3 className="font-slab text-h3 mb-2">Study Roadmap</h3>
        <p className="text-body text-muted-foreground">
          Set an exam date in your profile to generate a personalised timeline.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-6 rounded-ds-2xl p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Exam on</p>
          <p className="mt-1 font-slab text-h4 text-foreground">{formatDate(plan.exam)}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Weeks remaining</p>
            <p className="font-slab text-3xl font-semibold text-gradient-primary">{plan.totalWeeks}</p>
          </div>
          <div className="text-small text-muted-foreground">
            ≈ {plan.totalDays} day{plan.totalDays === 1 ? '' : 's'} to go
          </div>
        </div>
      </div>

      {currentStage && (
        <div className="rounded-2xl border border-electricBlue/40 bg-electricBlue/5 p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-electricBlue text-white">
              <Icon name={STAGE_META[currentStage.key].icon} size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue/80">Now focusing</p>
              <h4 className="font-slab text-h4 text-foreground">{currentStage.key}</h4>
              <p className="text-small text-muted-foreground">
                {formatRange(currentStage.start, currentStage.end)} • stay consistent with the highlighted focus chips below.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {plan.stages.map((stage) => {
          const meta = STAGE_META[stage.key];
          const width = Math.max((stage.weeks / plan.totalWeeks) * 100, 12);

          return (
            <div
              key={stage.key}
              className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition hover:border-border hover:shadow-lg"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-primary ring-2 ring-border/50">
                    <Icon name={meta.icon} size={20} />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Phase</div>
                    <h4 className="font-slab text-h4 text-foreground">{stage.key}</h4>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Allocation</div>
                  <div className="text-lg font-semibold text-foreground">
                    {stage.weeks} week{stage.weeks === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-small text-muted-foreground">{meta.description}</p>

              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/60">
                {/* width dynamic; keep gradient token classes */}
                <div className={`h-full bg-gradient-to-r ${meta.gradient}`} style={{ width: `${width}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {meta.focus.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-[0.7rem] font-medium text-muted-foreground"
                  >
                    <Icon name="Check" size={14} className="text-electricBlue" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {timeline.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h4 className="font-slab text-h4">Expanded timeline</h4>
            <span className="rounded-full bg-muted px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {plan.totalWeeks} week plan
            </span>
          </div>
          <ol className="relative space-y-4 border-l border-border/60 pl-5">
            {timeline.map((item) => {
              const meta = STAGE_META[item.key];
              return (
                <li key={item.key} className="relative pl-1">
                  <span
                    className={`absolute -left-[0.625rem] top-2 inline-flex h-3 w-3 items-center justify-center rounded-full border-2 ${
                      item.isComplete
                        ? 'border-muted-foreground/60 bg-muted-foreground/60'
                        : item.isActive
                        ? 'border-electricBlue bg-electricBlue'
                        : 'border-border/80 bg-background'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-1 rounded-xl bg-card/70 p-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        {formatRange(item.start, item.end)}
                      </span>
                      {item.isActive && (
                        <span className="inline-flex items-center rounded-full bg-electricBlue/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-electricBlue">
                          In progress
                        </span>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Phase</p>
                        <p className="font-slab text-h5 text-foreground">{item.key}</p>
                      </div>
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r ${meta.gradient} text-white`}>
                        <Icon name={meta.icon} size={18} />
                      </span>
                    </div>
                    <p className="text-small text-muted-foreground">{meta.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
};

export default GoalRoadmap;
