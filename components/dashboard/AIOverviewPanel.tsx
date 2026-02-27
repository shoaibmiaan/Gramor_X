import { Card } from '@/components/ui/Card';

export function AIOverviewPanel({
  currentBand,
  weeklyImprovement,
  nextAction,
}: {
  currentBand: string;
  weeklyImprovement: string;
  nextAction: string;
}) {
  return (
    <Card className="grid gap-4 md:grid-cols-3">
      <div>
        <p className="text-xs text-slate-400">Current Band Prediction</p>
        <p className="text-2xl font-semibold">{currentBand}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Weekly Improvement</p>
        <p className="text-2xl font-semibold text-emerald-600">{weeklyImprovement}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Next Recommended Action</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{nextAction}</p>
      </div>
    </Card>
  );
}
