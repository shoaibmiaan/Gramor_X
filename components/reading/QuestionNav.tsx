import * as React from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { cn } from '@/lib/utils';

export type FilterStatus = 'all' | 'unanswered' | 'flagged';

type QuestionNavProps = {
  /** Total questions in this test (1..N) */
  totalQuestions: number;
  /** 0-based index of the current question */
  currentIndex: number;
  /** Jump to a different question (0-based) */
  onChangeQuestion: (index: number) => void;

  /** Map: questionNumber (1..N) -> isAnswered */
  answeredMap: Record<number, boolean>;
  /** Map: questionNumber (1..N) -> isFlagged */
  flaggedMap?: Record<number, boolean>;

  /** Current filter mode for the nav (All / Unanswered / Flagged) */
  filterStatus: FilterStatus;
  onFilterStatusChange: (status: FilterStatus) => void;
};

const FILTERS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'flagged', label: 'Flagged' },
];

export const QuestionNav: React.FC<QuestionNavProps> = ({
  totalQuestions,
  currentIndex,
  onChangeQuestion,
  answeredMap,
  flaggedMap = {},
  filterStatus,
  onFilterStatusChange,
}) => {
  // Guard: clamp index into range and avoid NaN / negative
  const safeTotal = Math.max(0, totalQuestions);
  const clampedIndex =
    safeTotal > 0 ? Math.min(Math.max(0, currentIndex), safeTotal - 1) : 0;
  const currentQuestionNumber = safeTotal > 0 ? clampedIndex + 1 : 0;

  const answeredCount = React.useMemo(
    () =>
      Array.from({ length: safeTotal }).reduce((acc, _, i) => {
        const qNum = i + 1;
        return answeredMap[qNum] ? acc + 1 : acc;
      }, 0),
    [answeredMap, safeTotal],
  );

  const flaggedCount = React.useMemo(
    () =>
      Array.from({ length: safeTotal }).reduce((acc, _, i) => {
        const qNum = i + 1;
        return flaggedMap[qNum] ? acc + 1 : acc;
      }, 0),
    [flaggedMap, safeTotal],
  );

  const isVisibleUnderFilter = (qNum: number): boolean => {
    if (filterStatus === 'all') return true;
    const isAnswered = !!answeredMap[qNum];
    const isFlagged = !!flaggedMap[qNum];

    if (filterStatus === 'unanswered') return !isAnswered;
    if (filterStatus === 'flagged') return isFlagged;

    return true;
  };

  const handleClickQuestion = (idx: number) => {
    if (idx < 0 || idx >= safeTotal) return;
    onChangeQuestion(idx);
  };

  return (
    <Card
      className={cn(
        'w-full border border-border/70 bg-card/95',
        'flex flex-col gap-2 px-4 py-3',
      )}
    >
      {/* Top row: Question X of Y + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-muted-foreground">
          {safeTotal > 0 ? (
            <>
              Question{' '}
              <span className="font-semibold text-foreground">
                {currentQuestionNumber}
              </span>{' '}
              of {safeTotal}
              <span className="ml-2 text-[11px]">
                • Answered {answeredCount}/{safeTotal}
              </span>
              {flaggedCount > 0 ? (
                <span className="ml-2 text-[11px] text-amber-600 dark:text-amber-400">
                  • Flagged {flaggedCount}
                </span>
              ) : null}
            </>
          ) : (
            <span>No questions loaded</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              type="button"
              size="xs"
              variant={filterStatus === f.id ? 'secondary' : 'ghost'}
              className={cn(
                'h-7 px-3 text-[11px] font-medium rounded-full',
                filterStatus === f.id &&
                  'bg-primary/10 text-primary dark:text-primary-foreground',
              )}
              onClick={() => onFilterStatusChange(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom row: IELTS-style dots */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-1.5">
          {Array.from({ length: safeTotal }).map((_, idx) => {
            const qNum = idx + 1;
            if (!isVisibleUnderFilter(qNum)) return null;

            const isCurrent = qNum === currentQuestionNumber;
            const isAnswered = !!answeredMap[qNum];
            const isFlagged = !!flaggedMap[qNum];

            return (
              <button
                key={qNum}
                type="button"
                title={`Question ${qNum}${
                  isFlagged ? ' (flagged)' : isAnswered ? ' (answered)' : ''
                }`}
                onClick={() => handleClickQuestion(idx)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium',
                  'transition-colors focus:outline-none focus:ring-1 focus:ring-primary',
                  'border border-border/60 bg-muted text-muted-foreground',
                  isAnswered &&
                    'bg-emerald-500/20 border-emerald-500 text-emerald-700',
                  isFlagged &&
                    'bg-amber-500/20 border-amber-500 text-amber-700',
                  isCurrent &&
                    'bg-primary text-primary-foreground border-primary shadow-sm',
                )}
              >
                {qNum}
              </button>
            );
          })}
        </div>

        {/* Legend (IELTS-style) */}
        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground md:flex-row md:items-center md:gap-3">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full border border-border/70 bg-muted" />
            <span>Not answered</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span>Flagged</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <span>Current</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuestionNav;
