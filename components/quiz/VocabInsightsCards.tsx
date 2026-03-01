import React from 'react';
import useSWR from 'swr';

import { Card } from '@/components/design-system/Card';
import { WordStrengthIndicator } from '@/components/quiz/WordStrengthIndicator';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load vocabulary insights');
  return response.json();
};

export function VocabInsightsCards() {
  const { data, isLoading } = useSWR('/api/quiz/vocab/insights', fetcher);

  if (isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">Loading vocabulary intelligence…</Card>;
  }

  if (!data) return null;

  return (
    <Card className="space-y-4 p-4">
      <h3 className="text-sm font-semibold">Vocabulary intelligence</h3>
      <p className="text-xs text-muted-foreground">{data.recommendation}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase text-muted-foreground">Weak-word alert</p>
          <div className="space-y-2">
            {(data.weakWords ?? []).map((item: { wordId: string; strengthScore: number }) => (
              <WordStrengthIndicator key={item.wordId} label={item.wordId.slice(0, 8)} score={item.strengthScore} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase text-muted-foreground">Vocabulary heatmap</p>
          <div className="grid grid-cols-7 gap-1">
            {(data.heatmap ?? []).slice(-21).map((entry: { date: string; attempts: number; correct: number }) => {
              const intensity = Math.min(1, entry.attempts / 8);
              const tone = intensity > 0.75 ? 'bg-primary' : intensity > 0.45 ? 'bg-primary/70' : intensity > 0.2 ? 'bg-primary/40' : 'bg-primary/20';
              return (
                <div
                  key={entry.date}
                  className={`h-6 rounded ${tone}`}
                  title={`${entry.date}: ${entry.correct}/${entry.attempts}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default VocabInsightsCards;
