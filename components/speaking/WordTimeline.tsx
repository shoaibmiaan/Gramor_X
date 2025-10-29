import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

import type { WordScore } from '@/lib/speaking/scoreAudio';

type WordTimelineProps = {
  words: WordScore[];
};

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export function WordTimeline({ words }: WordTimelineProps) {
  if (words.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">No word-level alignment available for this attempt.</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">Word accuracy timeline</h3>
        <p className="text-xs text-muted-foreground">Tap each token to review stress notes.</p>
      </div>
      <ol className="divide-y divide-border/40">
        {words.map((word) => {
          const percent = Math.round(word.accuracy * 100);
          const stressTone = word.stressOk === false ? 'danger' : word.accuracy >= 0.75 ? 'success' : 'warning';
          return (
            <li key={`${word.text}-${word.startMs}`} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{word.text}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(word.startMs)} → {formatTime(word.endMs)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={stressTone} size="sm">
                    {percent}%
                  </Badge>
                  {word.stressOk === false && (
                    <Badge variant="danger" size="sm">
                      Stress off
                    </Badge>
                  )}
                </div>
              </div>
              {word.notes && <p className="mt-2 text-sm text-muted-foreground">{word.notes}</p>}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export default WordTimeline;
