import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

type HeatmapItem = { skill: string; score: number };
type SkillItem = { skill: string; score: number };

export function IdentityStatusSection({
  prediction,
  score,
  streak,
  heatmap,
  strengths,
  weaknesses,
}: {
  prediction?: { predictedBand?: number; confidenceInterval?: number; trend?: string };
  score?: number;
  streak: number;
  heatmap: HeatmapItem[];
  strengths: SkillItem[];
  weaknesses: SkillItem[];
}) {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">AI Learning Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your enterprise learning profile with score trend, skill heatmap, and study momentum.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6" interactive>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Predicted Band Score
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {typeof prediction?.predictedBand === 'number'
              ? prediction.predictedBand.toFixed(1)
              : typeof score === 'number'
                ? score.toFixed(1)
                : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Confidence ±
            {typeof prediction?.confidenceInterval === 'number'
              ? prediction.confidenceInterval
              : 0.5}{' '}
            · Trend: {prediction?.trend ?? 'stable'}
          </p>
        </Card>

        <Card className="p-6" interactive>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Study Streak</p>
          <p className="mt-2 text-3xl font-semibold">🔥 {streak} days</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Consistency is the fastest path to target band gains.
          </p>
        </Card>

        <Card className="p-6" interactive>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing & Usage</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Track plan usage meters and invoices in one place.
          </p>
          <Link
            href="/settings/billing"
            className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
          >
            View details
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6" interactive>
          <h2 className="text-base font-semibold">Skill Heatmap</h2>
          <div className="mt-3 space-y-2">
            {heatmap.map((item) => (
              <div key={item.skill} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{item.skill}</span>
                  <span>{item.score.toFixed(1)}/10</span>
                </div>
                <ProgressBar value={Math.max(0, Math.min(100, item.score * 10))} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6" interactive>
          <h2 className="text-base font-semibold">Strengths & Weaknesses</h2>
          <div className="mt-3 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-medium text-emerald-600">Strengths</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {strengths.map((s) => (
                  <li key={s.skill}>
                    {s.skill} ({s.score.toFixed(1)})
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-amber-600">Weaknesses</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {weaknesses.map((s) => (
                  <li key={s.skill}>
                    {s.skill} ({s.score.toFixed(1)})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
