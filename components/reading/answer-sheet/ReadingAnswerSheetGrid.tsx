import * as React from 'react';

import { Card } from '@/components/design-system/Card';

// Props for the ReadingAnswerSheetGrid. It takes the number of
// questions and a map of answers keyed by question order (1-indexed).
type ReadingAnswerSheetGridProps = {
  totalQuestions: number;
  answers: Record<number, string | string[] | null>;
};

/**
 * Displays a simple grid representing the user's answers to each
 * question. Answered questions are highlighted differently to provide
 * a quick overview of which questions were attempted.
 */
export const ReadingAnswerSheetGrid: React.FC<ReadingAnswerSheetGridProps> = ({
  totalQuestions,
  answers,
}) => {
  const cells = [];
  for (let i = 1; i <= totalQuestions; i++) {
    const hasAnswer = answers[i] != null;
    cells.push(
      <div
        key={i}
        className={
          'p-2 text-center border text-xs ' +
          (hasAnswer
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-muted/20 text-muted-foreground')
        }
      >
        {i}
      </div>,
    );
  }
  return (
    <Card className="p-3 space-y-2">
      <p className="text-xs font-medium">Answer sheet</p>
      <div className="grid grid-cols-10 gap-1">{cells}</div>
    </Card>
  );
};

export default ReadingAnswerSheetGrid;
