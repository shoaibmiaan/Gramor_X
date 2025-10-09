import React, { useMemo } from 'react';
import { Card } from '@/components/design-system/Card';

type PhaseKey = 'foundation' | 'practice' | 'review';

const PHASE_METADATA: Record<PhaseKey, { description: string; gradient: string }> = {
  foundation: {
    description: 'Lay the groundwork with grammar, vocabulary, and core strategies.',
    gradient: 'bg-gradient-to-br from-sky-500/15 via-sky-500/10 to-sky-500/30',
  },
  practice: {
    description: 'Apply skills with guided lessons, drills, and targeted module practice.',
    gradient: 'bg-gradient-to-br from-violet-500/15 via-violet-500/10 to-violet-500/35',
  },
  review: {
    description: 'Polish exam technique with mocks, analytics, and focused feedback.',
    gradient: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-emerald-500/35',
  },
};

const FALLBACK_PLAN = [
  { label: 'Foundation', weeks: 4 },
  { label: 'Practice', weeks: 4 },
  { label: 'Review', weeks: 4 },
];

export interface GoalRoadmapProps {
  examDate?: string | null;
}

export const GoalRoadmap: React.FC<GoalRoadmapProps> = ({ examDate }) => {
  const plan = useMemo(() => {
    if (!examDate) return null;
    const now = new Date();
    const exam = new Date(examDate);
    if (isNaN(exam.getTime()) || exam <= now) return null;
    const weeks = Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const foundation = Math.ceil(weeks * 0.4);
    const practice = Math.ceil(weeks * 0.4);
    const review = weeks - foundation - practice;
    return [
      { label: 'Foundation', weeks: foundation },
      { label: 'Practice', weeks: practice },
      { label: 'Review', weeks: review },
    ];
  }, [examDate]);

  const { phases, totalWeeks, personalized } = useMemo(() => {
    const source = plan ?? FALLBACK_PLAN;
    const normalized = source.map((phase) => {
      const key = phase.label.toLowerCase() as PhaseKey;
      const meta = PHASE_METADATA[key] ?? PHASE_METADATA.foundation;
      return {
        ...phase,
        key,
        description: meta.description,
        gradient: meta.gradient,
      };
    });
    const total = normalized.reduce((sum, phase) => sum + Math.max(phase.weeks, 0), 0);
    return { phases: normalized, totalWeeks: total, personalized: Boolean(plan) };
  }, [plan]);

  return (
    <Card className="p-6 rounded-ds-2xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-slab text-h3">Study Roadmap</h3>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {personalized ? 'Personalized from your exam date' : 'Sample 12-week plan'}
        </span>
      </div>

      {!personalized && (
        <p className="mt-2 text-body text-muted-foreground">
          Set an exam date to tailor the roadmap. Until then, here’s a balanced plan that keeps momentum steady each week.
        </p>
      )}

      {totalWeeks === 0 ? (
        <p className="mt-4 text-body">Add an exam date in your profile to build a preparation schedule.</p>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
            <div className="grid grid-cols-1 sm:flex">
              {phases.map((phase) => {
                const width = totalWeeks > 0 ? Math.max(phase.weeks, 0) / totalWeeks : 0;
                const basis = `${Math.max(width * 100, 10)}%`;
                return (
                  <div
                    key={phase.key}
                    className={`${phase.gradient} flex min-w-[6rem] flex-1 flex-col gap-1 px-4 py-3 text-left`}
                    style={{ flexBasis: basis }}
                    aria-label={`${phase.label} phase spans ${phase.weeks} ${phase.weeks === 1 ? 'week' : 'weeks'}`}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      {phase.label}
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {phase.weeks}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        wk{phase.weeks === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <ol className="space-y-3">
            {phases.map((phase) => (
              <li
                key={phase.key}
                className="rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{phase.label}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {phase.weeks} week{phase.weeks === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{phase.description}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
};

export default GoalRoadmap;
