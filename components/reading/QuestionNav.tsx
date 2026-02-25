// components/reading/QuestionNav.tsx
import * as React from 'react';
import { Button } from '@/components/design-system/Button';
import { cn } from '@/lib/utils';

export type FilterStatus = 'all' | 'unanswered' | 'flagged';

type QuestionNavProps = {
  totalQuestions: number;
  currentIndex: number;
  onChangeQuestion: (index: number) => void;
  answeredMap: Record<number, boolean>;
  flaggedMap?: Record<number, boolean>;
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
  const safeTotal = Math.max(0, totalQuestions);
  const currentQuestionNumber = safeTotal > 0 ? currentIndex + 1 : 0;

  const answeredCount = React.useMemo(
    () => Array.from({ length: safeTotal }).filter((_, i) => answeredMap[i + 1]).length,
    [answeredMap, safeTotal]
  );

  const flaggedCount = React.useMemo(
    () => Array.from({ length: safeTotal }).filter((_, i) => flaggedMap[i + 1]).length,
    [flaggedMap, safeTotal]
  );

  const isVisibleUnderFilter = (qNum: number): boolean => {
    if (filterStatus === 'all') return true;
    const isAnswered = !!answeredMap[qNum];
    const isFlagged = !!flaggedMap[qNum];
    if (filterStatus === 'unanswered') return !isAnswered;
    if (filterStatus === 'flagged') return isFlagged;
    return true;
  };

  return (
    <div className="w-full bg-card/95 px-3 py-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{currentQuestionNumber}</span>/{safeTotal}
          <span className="ml-2 text-[10px]">• {answeredCount} answered</span>
          {flaggedCount > 0 && (
            <span className="ml-2 text-[10px] text-amber-600">• {flaggedCount} flagged</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              size="sm"                    // increased from xs to sm for better tap target
              variant={filterStatus === f.id ? 'secondary' : 'ghost'}
              className={cn(
                'h-9 px-3 text-xs rounded-full', // larger height
                filterStatus === f.id && 'bg-primary/10 text-primary'
              )}
              onClick={() => onFilterStatusChange(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Question grid – increased tap target size */}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: safeTotal }).map((_, idx) => {
          const qNum = idx + 1;
          if (!isVisibleUnderFilter(qNum)) return null;

          const isCurrent = qNum === currentQuestionNumber;
          const isAnswered = !!answeredMap[qNum];
          const isFlagged = !!flaggedMap[qNum];

          return (
            <button
              key={qNum}
              onClick={() => onChangeQuestion(idx)}
              className={cn(
                'flex items-center justify-center h-9 w-9 rounded-full text-xs font-medium transition-colors', // larger 9×9
                'border border-border/60',
                isAnswered && 'bg-emerald-500/20 border-emerald-500 text-emerald-700',
                isFlagged && 'bg-amber-500/20 border-amber-500 text-amber-700',
                isCurrent && 'bg-primary text-primary-foreground border-primary ring-1 ring-primary/50',
                !isAnswered && !isFlagged && !isCurrent && 'bg-muted text-muted-foreground'
              )}
              aria-label={`Question ${qNum}, ${isAnswered ? 'answered' : 'unanswered'}, ${isFlagged ? 'flagged' : 'not flagged'}`}
            >
              {qNum}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="hidden md:flex items-center gap-3 mt-3 text-[8px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted border border-border/60" />
          <span>Not answered</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500/80" />
          <span>Flagged</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span>Current</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionNav;