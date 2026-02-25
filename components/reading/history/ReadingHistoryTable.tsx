// components/reading/history/ReadingHistoryTable.tsx
import * as React from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';

export type ReadingHistoryRow = {
  attemptId: string;
  testSlug: string;
  testTitle: string;
  bandScore: number | null;
  rawScore: number | null;
  totalQuestions: number | null;  // derived from meta.answers
  createdAt: string;
  status?: 'in_progress' | 'submitted'; // optional visual cue
};

type Props = {
  rows: ReadingHistoryRow[];
  className?: string;
};

export const ReadingHistoryTable: React.FC<Props> = ({ rows, className }) => {
  if (!rows.length) {
    return (
      <Card
        className={cn(
          'p-6 text-center text-sm text-muted-foreground rounded-xl border border-border/60 bg-card/95 shadow-sm',
          className
        )}
      >
        No reading attempts yet. Start a strict mock and your history will appear here.
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-card/95 shadow-sm',
        className
      )}
    >
      {/* HEADER */}
      <div
        className={cn(
          'grid',
          'grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]',
          'gap-3 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide',
          'bg-muted/40 text-muted-foreground'
        )}
      >
        <div>Test</div>
        <div>Band</div>
        <div>Score</div>
        <div className="text-right">Actions</div>
      </div>

      {/* BODY */}
      <div className="divide-y divide-border/60">
        {rows.map((row) => {
          const total = row.totalQuestions ?? 40;
          const raw = row.rawScore ?? 0;
          const band = row.bandScore;
          const accuracy = total > 0 ? Math.round((raw / total) * 100) : 0;

          // Band color logic
          let toneClass = 'bg-amber-500/15 text-amber-700 border border-amber-500/30';
          if (band !== null) {
            if (band >= 7.0) {
              toneClass = 'bg-emerald-600/15 text-emerald-700 border border-emerald-600/40';
            } else if (band < 6.0) {
              toneClass = 'bg-red-500/15 text-red-600 border border-red-500/40';
            }
          }

          const isInProgress = row.status === 'in_progress';

          return (
            <div
              key={row.attemptId}
              className={cn(
                'grid items-center',
                'grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]',
                'gap-3 px-4 py-3 text-xs transition-colors',
                'hover:bg-muted/30',
                isInProgress && 'opacity-75 italic'
              )}
            >
              {/* TEST INFO */}
              <div className="space-y-1 pr-4">
                <span className="text-sm font-medium truncate block">
                  {row.testTitle}
                </span>

                <div className="text-[11px] text-muted-foreground">
                  {isInProgress && (
                    <span className="inline-block mr-2">
                      <Badge variant="secondary" className="text-[9px] px-1">In Progress</Badge>
                    </span>
                  )}
                  Attempted on{' '}
                  {new Date(row.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* BAND + ACCURACY */}
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'w-fit px-2 py-0.5 text-[11px] rounded-ds-md font-medium shadow-sm',
                    toneClass
                  )}
                >
                  {band !== null ? `Band ${band.toFixed(1)}` : '—'}
                </Badge>
                <div className="text-[11px] text-muted-foreground">
                  Accuracy {accuracy}%
                </div>
              </div>

              {/* RAW SCORE */}
              <div className="flex flex-col text-[11px] text-muted-foreground">
                <span>
                  {raw}/{total} correct
                </span>
                {isInProgress && <span className="text-[10px] text-orange-600">partial</span>}
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  asChild
                  size="xs"
                  variant="outline"
                  className="rounded-ds-xl px-2 py-1 text-[11px]"
                  disabled={isInProgress}
                >
                  <Link href={`/mock/reading/result/${row.attemptId}`}>
                    <Icon name="file-text" className="h-3.5 w-3.5 mr-1" />
                    Result
                  </Link>
                </Button>

                <Button
                  asChild
                  size="xs"
                  variant={isInProgress ? 'secondary' : 'default'}
                  className="rounded-ds-xl px-2 py-1 text-[11px]"
                >
                  <Link href={`/mock/reading/review/${row.attemptId}`}>
                    <Icon name="eye" className="h-3.5 w-3.5 mr-1" />
                    {isInProgress ? 'Continue' : 'Review'}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ReadingHistoryTable;