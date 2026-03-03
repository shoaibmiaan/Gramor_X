import type { NextPage } from 'next';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { AICommandCenter } from '@/components/dashboard/AICommandCenter';
import { TrendChart } from '@/components/charts/TrendChart';
import useDashboard, {
  useEstimatedBandScore,
  useImprovementGraph,
  useSkillHeatmap,
  useStrengthsWeaknesses,
  useStudyStreak,
} from '@/hooks/useDashboard';

const DashboardPage: NextPage = () => {
  const { isLoading, error } = useDashboard();
  const { score } = useEstimatedBandScore();
  const { heatmap } = useSkillHeatmap();
  const { strengths, weaknesses } = useStrengthsWeaknesses();
  const { streak } = useStudyStreak();
  const { points } = useImprovementGraph();

  return (
    <DashboardLayout>
      <section className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">AI Learning Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your enterprise learning profile with score trend, skill heatmap, and study momentum.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            Failed to load dashboard analytics.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Band Score</p>
            <p className="mt-2 text-3xl font-semibold">{typeof score === 'number' ? score.toFixed(1) : '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Trend-aware estimate from your latest attempts.</p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Study Streak</p>
            <p className="mt-2 text-3xl font-semibold">🔥 {streak} days</p>
            <p className="mt-1 text-xs text-muted-foreground">Consistency is the fastest path to target band gains.</p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Billing & Usage</p>
            <p className="mt-2 text-sm text-muted-foreground">Track plan usage meters and invoices in one place.</p>
            <Link href="/settings/billing" className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:underline">
              Open billing transparency panel
            </Link>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <h2 className="text-base font-semibold">Skill Heatmap</h2>
            <div className="mt-3 space-y-2">
              {heatmap.map((item) => (
                <div key={item.skill} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{item.skill}</span>
                    <span>{item.score.toFixed(1)}/10</span>
                  </div>
                  <div className="h-2 rounded bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded bg-indigo-500" style={{ width: `${Math.max(0, Math.min(100, item.score * 10))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
            <h2 className="text-base font-semibold">Strengths & Weaknesses</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-emerald-600">Strengths</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {strengths.map((s) => (
                    <li key={s.skill}>{s.skill} ({s.score.toFixed(1)})</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-amber-600">Weaknesses</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {weaknesses.map((s) => (
                    <li key={s.skill}>{s.skill} ({s.score.toFixed(1)})</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <TrendChart
            title="Improvement Graph"
            points={(points.length ? points : [{ label: 'No data', band: 0 }]).map((p) => ({ label: p.label, value: p.band }))}
          />
        </section>

        {isLoading ? <p className="text-xs text-muted-foreground">Loading dashboard analytics…</p> : null}
      </section>
      <AICommandCenter />
    </DashboardLayout>
  );
};

export default DashboardPage;
