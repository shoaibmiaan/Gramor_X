// components/reading/VirtualizedQuestionList.tsx
import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ReadingQuestionItem } from './ReadingQuestionItem';
import type { ReadingQuestion } from '@/lib/reading/types';
import { cn } from '@/lib/utils';

type VirtualizedQuestionListProps = {
  questions: ReadingQuestion[];
  answers: Record<string, any>;
  flags: Record<string, boolean>;
  currentQuestionId: string | null;
  onAnswerChange: (id: string, value: any) => void;
  onToggleFlag: (id: string) => void;
  zoom: 'sm' | 'md' | 'lg';
  itemRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  height?: number;
};

const ITEM_HEIGHT = 200; // Consider making this dynamic based on zoom if needed

export const VirtualizedQuestionList: React.FC<VirtualizedQuestionListProps> = ({
  questions,
  answers,
  flags,
  currentQuestionId,
  onAnswerChange,
  onToggleFlag,
  zoom,
  itemRefs,
  height = 600,
}) => {
  // Memoize the row render function so it only changes when its dependencies change.
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const q = questions[index];
      const isCurrent = q.id === currentQuestionId;

      return (
        <div
          ref={(el) => {
            itemRefs.current[q.id] = el;
          }}
          style={style}
          className={cn(
            'px-2 py-1',
            isCurrent && 'ring-2 ring-primary/50 bg-primary/5 rounded-lg'
          )}
        >
          <ReadingQuestionItem
            question={q}
            value={answers[q.id] ?? null}
            onChange={(v) => onAnswerChange(q.id, v)}
            isFlagged={flags[q.id] ?? false}
            onToggleFlag={() => onToggleFlag(q.id)}
            noBorder
          />
        </div>
      );
    },
    [questions, answers, flags, currentQuestionId, onAnswerChange, onToggleFlag, itemRefs]
  );

  return (
    <List
      height={height}
      itemCount={questions.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      className="scrollbar-thin scrollbar-thumb-muted-foreground/30"
    >
      {Row}
    </List>
  );
};