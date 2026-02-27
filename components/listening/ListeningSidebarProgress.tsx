// components/listening/ListeningSidebarProgress.tsx
import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

export type ListeningSectionProgress = {
  id: string;
  order: number;
  label: string;
  totalQuestions: number;
  answeredQuestions: number;
  isCurrent: boolean;
  isCompleted: boolean;
  isLocked?: boolean;
};

export type ListeningQuestionProgress = {
  id: string;
  questionNo: number;
  isAnswered: boolean;
  isFlagged?: boolean;
  isCurrent?: boolean;
};

type ListeningSidebarProgressProps = {
  sections: ListeningSectionProgress[];
  currentSectionId: string | null;
  currentSectionQuestions: ListeningQuestionProgress[];
  onJumpToSection?: (sectionId: string) => void;
  onJumpToQuestion?: (questionId: string) => void;
};

export const ListeningSidebarProgress: React.FC<ListeningSidebarProgressProps> = ({
  sections,
  currentSectionId,
  currentSectionQuestions,
  onJumpToSection,
  onJumpToQuestion,
}) => {
  const totalQuestions = React.useMemo(
    () => sections.reduce((sum, s) => sum + s.totalQuestions, 0),
    [sections]
  );

  const totalAnswered = React.useMemo(
    () => sections.reduce((sum, s) => sum + s.answeredQuestions, 0),
    [sections]
  );

  const answeredPct = totalQuestions > 0
    ? Math.round((totalAnswered / totalQuestions) * 100)
    : 0;

  const currentSection = sections.find((s) => s.id === currentSectionId) ?? null;

  return (
    <aside className="flex h-full flex-col gap-3 rounded-ds-2xl bg-card/90 p-3 shadow-sm">
      {/* Header */}
      <Card className="border-none bg-muted/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Listening progress
            </p>
            <p className="text-sm font-semibold">
              {totalAnswered}/{totalQuestions} answered
            </p>
          </div>
          <Badge tone={answeredPct === 100 ? 'success' : 'info'} size="sm">
            {answeredPct}%
          </Badge>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${answeredPct}%` }}
          />
        </div>
      </Card>

      {/* Sections list */}
      <Card className="flex-1 space-y-2 overflow-hidden border-none bg-background/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sections
          </p>
          <Badge tone="neutral" size="xs">
            {sections.length} total
          </Badge>
        </div>

        <div className="mt-1 space-y-1.5">
          {sections.map((section) => {
            const isCurrent = section.id === currentSectionId;
            const isLocked = section.isLocked && !isCurrent;
            const completionPct =
              section.totalQuestions > 0
                ? Math.round(
                    (section.answeredQuestions / section.totalQuestions) * 100
                  )
                : 0;

            return (
              <button
                key={section.id}
                type="button"
                disabled={isLocked}
                onClick={() =>
                  !isLocked && onJumpToSection && onJumpToSection(section.id)
                }
                className={[
                  'group flex w-full items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-all',
                  isCurrent
                    ? 'border-primary/80 bg-primary/5'
                    : 'border-border/80 bg-muted/40 hover:bg-muted',
                  isLocked ? 'cursor-not-allowed opacity-60' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    size="xs"
                    tone={isCurrent ? 'primary' : section.isCompleted ? 'success' : 'neutral'}
                  >
                    S{section.order}
                  </Badge>
                  <div>
                    <p className="text-xs font-medium">{section.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {section.answeredQuestions}/{section.totalQuestions} answered
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isLocked && (
                    <Icon
                      name="lock-closed"
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                  )}
                  {!isLocked && isCurrent && (
                    <Icon
                      name="chevron-right"
                      className="h-3.5 w-3.5 text-primary"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Question map for current section */}
        {currentSection && (
          <div className="mt-3 space-y-1.5 rounded-lg bg-muted/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Section {currentSection.order} questions
              </p>
              <Badge tone="neutral" size="xs">
                {currentSectionQuestions.length}
              </Badge>
            </div>

            <div className="grid grid-cols-6 gap-1">
              {currentSectionQuestions.map((q) => {
                const base =
                  'flex h-7 items-center justify-center rounded-md border text-[11px] font-medium transition-all';
                const stateClass = q.isCurrent
                  ? 'border-primary bg-primary text-primary-foreground'
                  : q.isAnswered
                  ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted';

                const flaggedRing =
                  q.isFlagged && !q.isCurrent
                    ? 'ring-1 ring-amber-400 ring-offset-1 ring-offset-background'
                    : '';

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() =>
                      onJumpToQuestion && onJumpToQuestion(q.id)
                    }
                    className={`${base} ${stateClass} ${flaggedRing}`}
                  >
                    {q.questionNo}
                  </button>
                );
              })}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <LegendDot className="border-emerald-500/70 bg-emerald-500/10" label="Answered" />
              <LegendDot className="border-border" label="Not answered" />
              <LegendDot className="border-primary bg-primary" label="Current" />
              <LegendDot className="ring-amber-400" label="Flagged" />
            </div>
          </div>
        )}
      </Card>

      {/* Bottom shortcuts */}
      <Card className="border-none bg-muted/60 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            tone="neutral"
            size="xs"
            variant="ghost"
            className="px-1.5 text-[11px]"
            type="button"
          >
            <Icon name="flag" className="mr-1 h-3.5 w-3.5" />
            Review flagged later
          </Button>
          <Button
            tone="primary"
            size="xs"
            variant="ghost"
            className="px-1.5 text-[11px]"
            type="button"
          >
            <Icon name="arrow-right-circle" className="mr-1 h-3.5 w-3.5" />
            Next section
          </Button>
        </div>
      </Card>
    </aside>
  );
};

type LegendDotProps = {
  className?: string;
  label: string;
};

const LegendDot: React.FC<LegendDotProps> = ({ className, label }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={[
          'inline-flex h-3 w-3 items-center justify-center rounded-sm border bg-background',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
};
