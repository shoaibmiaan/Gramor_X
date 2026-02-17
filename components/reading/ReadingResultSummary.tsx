// components/reading/ReadingResultSummary.tsx
import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

type AttemptSummary = {
  id: string;
  rawScore: number | null;
  bandScore: number | null;
  questionCount: number | null;
  durationSeconds: number | null;
  createdAt: string;
};

type TestSummary = {
  id: string;
  slug: string;
  title: string;
  examType: string;
  totalQuestions: number | null;
  durationSeconds: number | null;
};

type Props = {
  attempt: AttemptSummary;
  test: TestSummary;
};

export const ReadingResultSummary: React.FC<Props> = ({ attempt, test }) => {
  const totalQs = attempt.questionCount ?? test.totalQuestions ?? 40;
  const raw = attempt.rawScore ?? 0;
  const band = attempt.bandScore ?? null;

  const accuracy = totalQs > 0 ? Math.round((raw / totalQs) * 100) : 0;

  const mins = attempt.durationSeconds
    ? Math.floor(attempt.durationSeconds / 60)
    : Math.round((test.durationSeconds ?? 3600) / 60);

  let bandTone: 'good' | 'ok' | 'low' = 'ok';
  if (band != null) {
    if (band >= 7) bandTone = 'good';
    else if (band < 6) bandTone = 'low';
  }

  const bandBadgeClass =
    bandTone === 'good'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40'
      : bandTone === 'low'
      ? 'bg-destructive/10 text-destructive border-destructive/40'
      : 'bg-amber-500/10 text-amber-700 border-amber-500/40';

  return (
    <Card className="p-6 space-y-4 bg-background/95 dark:bg-dark/90 border border-lightBorder dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                bandBadgeClass +
                ' border text-xs font-semibold rounded-ds px-2 py-1'
              }
            >
              Band {band != null ? band.toFixed(1) : '—'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Accuracy {accuracy}% ({raw}/{totalQs})
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            This band is an estimate based on your raw score out of {totalQs}{' '}
            questions. Use it as a signal, then dig into your detailed review to
            fix weaknesses.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Time used: {mins} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="book-open" className="h-3.5 w-3.5" />
            {test.examType === 'gt'
              ? 'General Training'
              : 'Academic'}{' '}
            Reading
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-ds border border-lightBorder/70 p-3 dark:border-white/10">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em] mb-1">
            Raw score
          </p>
          <p className="text-sm font-semibold text-foreground">
            {raw}/{totalQs}
          </p>
        </div>
        <div className="rounded-ds border border-lightBorder/70 p-3 dark:border-white/10">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em] mb-1">
            Estimated band
          </p>
          <p className="text-sm font-semibold text-foreground">
            {band != null ? band.toFixed(1) : '—'}
          </p>
        </div>
        <div className="rounded-ds border border-lightBorder/70 p-3 dark:border-white/10">
          <p className="text-[11px] text-muted-foreground uppercase tracking-[0.16em] mb-1">
            Speed
          </p>
          <p className="text-sm font-semibold text-foreground">
            {mins} min ·{' '}
            {totalQs > 0 ? Math.round(totalQs / (mins || 1)) : 0} Q/min (approx)
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ReadingResultSummary;
