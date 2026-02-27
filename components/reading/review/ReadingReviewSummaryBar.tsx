import * as React from 'react';

import { Card } from '@/components/design-system/Card';

// Props describing the information required to summarise a reading
// attempt in the review view. All numeric fields may be null when
// information is unavailable.
type ReadingReviewSummaryBarProps = {
  testTitle: string;
  bandScore: number | null;
  rawScore: number | null;
  totalQuestions: number | null;
  createdAt: string;
  durationSeconds?: number;
};

/**
 * Displays a concise summary of a completed reading attempt, including
 * the test title, date completed, band score, raw/total score and
 * duration. It is typically rendered at the top of the review page.
 */
export const ReadingReviewSummaryBar: React.FC<ReadingReviewSummaryBarProps> = ({
  testTitle,
  bandScore,
  rawScore,
  totalQuestions,
  createdAt,
  durationSeconds,
}) => {
  return (
    <Card className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs">
      <div className="space-y-0.5">
        <p className="font-medium">{testTitle}</p>
        <p className="text-muted-foreground">
          Completed on {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-4 pt-2 sm:pt-0">
        <div>
          <p className="font-medium">
            {bandScore != null ? bandScore.toFixed(1) : '-'}
          </p>
          <p className="text-muted-foreground">Band</p>
        </div>
        <div>
          <p className="font-medium">
            {rawScore != null ? rawScore : '-'} / {totalQuestions != null ? totalQuestions : '-'}
          </p>
          <p className="text-muted-foreground">Correct</p>
        </div>
        {durationSeconds != null && (
          <div>
            <p className="font-medium">{Math.round(durationSeconds / 60)} min</p>
            <p className="text-muted-foreground">Duration</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ReadingReviewSummaryBar;
