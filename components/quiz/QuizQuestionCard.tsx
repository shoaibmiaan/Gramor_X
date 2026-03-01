import React from 'react';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import type { PublicQuizQuestion } from '@/lib/services/vocabQuizService';

export function QuizQuestionCard({
  question,
  onSelect,
  disabled,
}: {
  question: PublicQuizQuestion;
  onSelect: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{question.tag}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{question.prompt}</p>
      </div>
      <div className="grid gap-2">
        {question.options.map((option, index) => (
          <Button
            key={`${question.id}-${option}`}
            type="button"
            variant="secondary"
            className="justify-start"
            onClick={() => onSelect(index)}
            disabled={disabled}
            aria-label={`Select ${option}`}
          >
            {option}
          </Button>
        ))}
      </div>
    </Card>
  );
}

export default QuizQuestionCard;
