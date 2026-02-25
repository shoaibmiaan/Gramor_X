import { useMemo } from 'react';
import { Card } from '@/components/design-system/Card';

const splitSentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

type DiffChunk = {
  type: 'same' | 'added' | 'removed';
  value: string;
};

const buildDiff = (previous: string, current: string): DiffChunk[] => {
  const prev = splitSentences(previous);
  const next = splitSentences(current);
  const dp: number[][] = Array.from({ length: prev.length + 1 }, () => Array(next.length + 1).fill(0));

  for (let i = prev.length - 1; i >= 0; i -= 1) {
    for (let j = next.length - 1; j >= 0; j -= 1) {
      if (prev[i].toLowerCase() === next[j].toLowerCase()) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: DiffChunk[] = [];
  let i = 0;
  let j = 0;

  while (i < prev.length && j < next.length) {
    if (prev[i].toLowerCase() === next[j].toLowerCase()) {
      result.push({ type: 'same', value: next[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', value: prev[i] });
      i += 1;
    } else {
      result.push({ type: 'added', value: next[j] });
      j += 1;
    }
  }

  while (i < prev.length) {
    result.push({ type: 'removed', value: prev[i] });
    i += 1;
  }

  while (j < next.length) {
    result.push({ type: 'added', value: next[j] });
    j += 1;
  }

  return result;
};

export type DiffViewerProps = {
  previous?: string | null;
  current: string;
};

export const DiffViewer = ({ previous, current }: DiffViewerProps) => {
  const diff = useMemo(() => (previous ? buildDiff(previous, current) : null), [previous, current]);

  if (!previous || !diff) {
    return (
      <Card className="space-y-2" padding="lg">
        <h2 className="text-lg font-semibold text-foreground">Draft comparison</h2>
        <p className="text-sm text-muted-foreground">Write a redraft to compare paragraph-by-paragraph improvements.</p>
      </Card>
    );
  }

  const removals = diff.filter((chunk) => chunk.type === 'removed');

  return (
    <Card className="space-y-4" padding="lg">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Diff vs. previous attempt</h2>
        <p className="text-sm text-muted-foreground">New or revised sentences are highlighted to show progress.</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm leading-relaxed text-foreground">
        {diff
          .filter((chunk) => chunk.type !== 'removed')
          .map((chunk, index) =>
            chunk.type === 'added' ? (
              <mark key={`${chunk.value}-${index}`} className="rounded bg-success/20 px-1 py-0.5">
                {chunk.value}{' '}
              </mark>
            ) : (
              <span key={`${chunk.value}-${index}`}>{chunk.value} </span>
            ),
          )}
      </div>
      {removals.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border/60 bg-card/50 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Removed sentences</p>
          <ul className="list-disc space-y-1 pl-5">
            {removals.map((chunk, index) => (
              <li key={`${chunk.value}-${index}`}>{chunk.value}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
