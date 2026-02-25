import * as React from 'react';

import type { ReadingQuestion } from '@/lib/reading/types';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type ReadingReviewQuestionItemProps = {
  question: ReadingQuestion;
  userAnswer: string | string[] | null;
  isCorrect: boolean;
};

export const ReadingReviewQuestionItem: React.FC<
  ReadingReviewQuestionItemProps
> = ({ question, userAnswer, isCorrect }) => {
  const formatAnswer = (ans: any): string => {
    if (ans == null) return '-';
    if (Array.isArray(ans)) return ans.join(', ');
    return String(ans);
  };

  const borderTone = isCorrect
    ? 'border-emerald-500/50 bg-emerald-500/5'
    : 'border-destructive/40 bg-destructive/5';

  return (
    <Card
      className={`p-3 space-y-2 text-sm border-l-4 ${
        isCorrect ? 'border-l-emerald-500' : 'border-l-destructive'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex-1">
          <span className="font-medium mr-1">
            {(question as any).questionOrder}.
          </span>
          {question.prompt}
        </p>
        <Badge
          size="xs"
          variant="outline"
          className={borderTone + ' text-[10px] font-semibold uppercase'}
        >
          {isCorrect ? 'Correct' : 'Incorrect'}
        </Badge>
      </div>

      {question.instruction && (
        <p className="text-xs text-muted-foreground">{question.instruction}</p>
      )}

      <div className="text-xs space-y-0.5">
        <p>
          Your answer:{' '}
          <span className="font-medium">
            {formatAnswer(userAnswer)}
          </span>
        </p>
        <p>
          Correct answer:{' '}
          <span className="font-medium">
            {formatAnswer((question as any).correctAnswer)}
          </span>
        </p>
      </div>
    </Card>
  );
};

export default ReadingReviewQuestionItem;
