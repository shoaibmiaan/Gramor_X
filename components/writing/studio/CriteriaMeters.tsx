import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import type { ScoresJson } from '@/lib/writing/schemas';

const CRITERIA_LABELS: Array<keyof ScoresJson> = ['TR', 'CC', 'LR', 'GRA'];

export type CriteriaMetersProps = {
  scores: ScoresJson | null | undefined;
};

export const CriteriaMeters = ({ scores }: CriteriaMetersProps) => {
  return (
    <Card className="space-y-4" padding="lg">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Band breakdown</h2>
        <p className="text-sm text-muted-foreground">Task response, cohesion, lexical range, and grammar accuracy.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {CRITERIA_LABELS.map((criterion) => {
          const value = scores?.[criterion] ?? null;
          return (
            <div key={criterion} className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{criterion}</p>
                <span className="text-sm font-medium text-foreground">{value != null ? value.toFixed(1) : '—'}</span>
              </div>
              <ProgressBar value={value ? Math.min(100, Math.round((value / 9) * 100)) : 0} tone={value ? 'success' : 'default'} ariaLabel={`${criterion} meter`} />
            </div>
          );
        })}
      </div>
    </Card>
  );
};
