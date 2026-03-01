import React from 'react';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type QuizResult = {
  score: { correct: number; total: number; accuracy: number; weightedAccuracy: number };
  estimatedBandImpact: { before: number; after: number; delta: number };
  strengths: string[];
  weaknesses: string[];
  recommendedNextWords: string[];
};

export function QuizResultSummary({ result }: { result: QuizResult }) {
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h4 font-semibold">Quiz complete</h3>
        <Badge variant="success" size="sm">{result.score.accuracy}%</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {result.score.correct}/{result.score.total} correct · Weighted {result.score.weightedAccuracy}%
      </p>
      <p className="text-sm">Band projection: {result.estimatedBandImpact.before} → {result.estimatedBandImpact.after}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Strengths</p>
          <p className="text-sm">{result.strengths.join(', ') || 'Keep practising.'}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Weaknesses</p>
          <p className="text-sm">{result.weaknesses.join(', ') || 'No major weaknesses detected.'}</p>
        </div>
      </div>
    </Card>
  );
}

export default QuizResultSummary;
