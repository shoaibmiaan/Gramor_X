// components/reading/ReadingHeatmap.tsx
import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

type Row = { type: 'tfng' | 'mcq' | 'matching' | 'short'; accuracy: number; attempts: number };

const LABELS = { tfng: 'TFNG', mcq: 'MCQ', matching: 'Matching', short: 'Short' } as const;

export const ReadingHeatmap: React.FC<{ data: Row[] }> = ({ data }) => {
  const rows = (data ?? []).map(d => ({ ...d, acc: Math.max(0, Math.min(1, d.accuracy)) }));
  return (
    <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
      <div className="mb-2 text-sm font-medium">Weak spot heatmap</div>
      <div className="grid grid-cols-4 gap-2">
        {rows.map((r) => {
          const intensity = Math.round(r.acc * 100);
          const bg = `hsla(260, 90%, ${95 - intensity * 0.4}%, 1)`; // lighter when lower acc
          const text = r.acc >= 0.7 ? 'text-foreground' : 'text-foreground';
          return (
            <div key={r.type} className="rounded-lg p-3" style={{ background: bg }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{LABELS[r.type]}</span>
                <Badge size="xs" variant={r.acc >= 0.75 ? 'success' : r.acc >= 0.6 ? 'warning' : 'danger'}>
                  {(r.acc * 100).toFixed(0)}%
                </Badge>
              </div>
              <div className={`mt-1 text-[11px] ${text}`}>{r.attempts} attempts</div>
            </div>
          );
        })}
        {!rows.length && <div className="col-span-4 text-xs text-muted-foreground">No data yet</div>}
      </div>
    </Card>
  );
};
