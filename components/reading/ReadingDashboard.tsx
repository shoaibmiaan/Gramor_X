// components/reading/ReadingDashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { Icon } from '@/components/design-system/Icon';

type WeakArea = { label: string; reason: string; href: string; secondary?: string };
type TrendPoint = { date: string; score: number }; // 0..1
type TypeBreak = { type: 'tfng' | 'mcq' | 'matching' | 'short'; accuracy: number; attempts: number };
type TimeScore = { id: string; minutes: number; score: number };
type Recent = { slug: string; title: string; date: string; score: number; minutes: number; types: string[]; hrefReview: string };
type SavedItem = { slug: string; title: string; href: string };
type QueuedItem = { label: string; href: string };
type Quota = { dayUsed: number; dayLimit: number | null; monthUsed: number; monthLimit: number | null };

type DashboardPayload = {
  kpis?: {
    bandEstimate?: number;
    bandStd?: number;
    accuracy10?: number;       // 0..1
    accuracyDelta10?: number;  // -1..1
    avgSecPerQ?: number;
    streakDays?: number;
    totalPractices?: number;
  };
  trend?: TrendPoint[];
  byType?: TypeBreak[];
  timeVsScore?: TimeScore[];
  weakAreas?: WeakArea[];
  recent?: Recent[];
  saved?: SavedItem[];
  queued?: QueuedItem[];
  quota?: Quota;
};

type AIRecommend = {
  forecast?: { targetBand: number; etaDays: number; confidence: 'low'|'med'|'high'; rationale: string };
  actions: Array<{ label: string; reason: string; href: string; secondary?: string }>;
  tips?: string[];
};

type ForecastPayload = {
  bandNow: number;
  currentPct: number;
  targetBand: number;
  etaDays: number | null;
  confidence: 'low' | 'med' | 'high';
  rationale: string;
};

function pct(n?: number, digits = 0) {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}
function band(b?: number, std?: number) {
  if (typeof b !== 'number' || !isFinite(b)) return '—';
  return typeof std === 'number' && isFinite(std) && std > 0 ? `${b.toFixed(1)} (±${std.toFixed(1)})` : b.toFixed(1);
}
function clamp01(n: number) {
  return Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
}

export const ReadingDashboard: React.FC = () => {
  // Base dashboard
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // AI Coach
  const [coach, setCoach] = useState<AIRecommend | null>(null);
  const [coachErr, setCoachErr] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);

  // Forecast
  const [fc, setFc] = useState<ForecastPayload | null>(null);
  const [fcLoading, setFcLoading] = useState(true);

  // AI Summary
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/reading/dashboard');
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const j = (await r.json()) as DashboardPayload;
        if (!cancelled) { setData(j); setErr(null); }
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || 'Failed to load dashboard'); setData(null); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCoachLoading(true);
        const r = await fetch('/api/ai/recommend');
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const j = (await r.json()) as AIRecommend;
        if (!cancelled) { setCoach(j); setCoachErr(null); }
      } catch (e: any) {
        if (!cancelled) { setCoachErr(e?.message || 'AI coach unavailable'); setCoach(null); }
      } finally {
        if (!cancelled) setCoachLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFcLoading(true);
        const r = await fetch('/api/reading/forecast?target=7.0');
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        const j = (await r.json()) as ForecastPayload;
        if (!cancelled) setFc(j);
      } catch {
        if (!cancelled) setFc(null);
      } finally {
        if (!cancelled) setFcLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSummaryLoading(true);
        const r = await fetch('/api/ai/summary');
        const j = await r.json();
        if (!cancelled) setSummary(j.summary || '');
      } catch {
        if (!cancelled) setSummary('');
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const k = data?.kpis ?? {};
  const acc10 = typeof k.accuracy10 === 'number' ? clamp01(k.accuracy10) : undefined;
  const accDelta = typeof k.accuracyDelta10 === 'number' ? k.accuracyDelta10 : undefined;

  const minutesRange = useMemo(() => {
    const xs = data?.timeVsScore?.map(d => d.minutes) ?? [];
    if (!xs.length) return { min: 0, max: 1 };
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    return { min, max: Math.max(max, min + 1) };
  }, [data]);

  if (err) return <Alert variant="warning" title="Couldn’t load dashboard">{err}</Alert>;

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-24 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI STRIP */}
      <Card className="p-4 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Band (Reading)</div>
            <div className="text-lg font-semibold">{band(k.bandEstimate, k.bandStd)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Accuracy (last 10)</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{pct(acc10)}</span>
              {typeof accDelta === 'number' && (
                <Badge variant={accDelta >= 0 ? 'success' : 'danger'} size="xs">
                  {accDelta >= 0 ? '+' : ''}{(accDelta * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Speed</div>
            <div className="text-lg font-semibold">
              {k.avgSecPerQ ? `${(k.avgSecPerQ / 60).toFixed(2)} min/Q` : '—'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Streak</div>
            <div className="text-lg font-semibold">{k.streakDays ?? '—'}d</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold">{k.totalPractices ?? '—'}</div>
          </div>
        </div>
      </Card>

      {/* AI COACH */}
      <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold inline-flex items-center gap-2">
            <Icon name="Sparkles" /> AI Coach
          </h3>
          <div className="text-xs text-muted-foreground">
            {coachLoading ? 'Generating…' : coachErr ? 'Unavailable' : 'Personalized tips'}
          </div>
        </div>

        {coachLoading && (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        )}

        {!coachLoading && coach && (
          <div className="space-y-4">
            {coach.forecast && (
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="info" size="sm">Forecast</Badge>
                <span>
                  {`→ Band ${coach.forecast.targetBand.toFixed(1)} in ~${coach.forecast.etaDays} days `}
                  <span className="text-muted-foreground">({coach.forecast.confidence} conf.)</span>
                </span>
                <span className="text-muted-foreground">— {coach.forecast.rationale}</span>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              {coach.actions.slice(0, 3).map(a => (
                <div key={a.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.label}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.reason}</div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <Link href={a.href}><Button variant="primary" size="sm" className="rounded-ds-xl">Start</Button></Link>
                    {a.secondary && <Link href={a.secondary}><Button variant="surface" size="sm" className="rounded-ds-xl">Review</Button></Link>}
                  </div>
                </div>
              ))}
            </div>

            {coach.tips?.length ? (
              <ul className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                {coach.tips.slice(0, 3).map(t => (
                  <li key={t} className="rounded-md bg-muted px-2 py-1">{t}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {!coachLoading && !coach && !coachErr && (
          <div className="text-xs text-muted-foreground">No suggestions yet.</div>
        )}

        {!coachLoading && coachErr && (
          <div className="text-xs text-muted-foreground">AI coach unavailable — try again later.</div>
        )}
      </Card>

      {/* FORECAST • HEATMAP • AI SUMMARY */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Forecast */}
        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold inline-flex items-center gap-2">
              <Icon name="TrendingUp" /> Forecast
            </h3>
            {fc && (
              <Badge variant={fc.confidence === 'high' ? 'success' : fc.confidence === 'med' ? 'info' : 'warning'} size="xs">
                {fc.confidence} conf.
              </Badge>
            )}
          </div>
          {fcLoading ? (
            <div className="mt-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ) : fc ? (
            <>
              <div className="mt-2 text-sm">
                Current: <span className="font-semibold">Band {fc.bandNow.toFixed(1)}</span>
                {` → Target ${fc.targetBand.toFixed(1)} `}
                {fc.etaDays === null ? (
                  <span className="text-muted-foreground">• improve slope to reach target</span>
                ) : (
                  <span className="font-semibold">in ~{fc.etaDays} days</span>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{fc.rationale}</div>
              <div className="mt-3">
                <Link href="/reading?type=tfng" className="inline-flex">
                  <Button variant="surface" size="sm" className="rounded-ds-xl">Boost slope: weakest type</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-2 text-xs text-muted-foreground">No history yet</div>
          )}
        </Card>

        {/* Heatmap */}
        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
          <div className="mb-2 text-sm font-medium">Weak spot heatmap</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(data.byType ?? []).map((r) => {
              const acc = clamp01(r.accuracy);
              const intensity = Math.round(acc * 100);
              const bg = `hsla(260, 90%, ${95 - intensity * 0.4}%, 1)`;
              return (
                <div key={r.type} className="rounded-lg p-3" style={{ background: bg }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium capitalize">{r.type}</span>
                    <Badge size="xs" variant={acc >= 0.75 ? 'success' : acc >= 0.6 ? 'warning' : 'danger'}>
                      {(acc * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="mt-1 text-[11px]">{r.attempts} attempts</div>
                </div>
              );
            })}
            {!data.byType?.length && <div className="col-span-4 text-xs text-muted-foreground">No data yet</div>}
          </div>
        </Card>

        {/* AI Summary */}
        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
          <div className="text-sm font-semibold inline-flex items-center gap-2">
            <Icon name="Lightbulb" /> Recent Activity — AI Summary
          </div>
          {summaryLoading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{summary || 'No sessions yet.'}</p>
          )}
        </Card>
      </div>

      {/* PROGRESS (trend + time vs score) */}
      <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Trend sparkbars */}
          <div>
            <div className="mb-2 text-sm font-medium">Trend (last 20)</div>
            <div className="flex h-24 items-end gap-1">
              {(data.trend?.slice(-20) ?? []).map((p, i) => {
                const h = Math.max(6, Math.round(clamp01(p.score) * 88));
                return <div key={i} className="w-2 rounded-t bg-electricBlue/40" style={{ height: `${h}px` }} />;
              })}
              {!data.trend?.length && <div className="text-xs text-muted-foreground">No attempts yet</div>}
            </div>
          </div>

          {/* Time vs score */}
          <div>
            <div className="mb-2 text-sm font-medium">Time vs score</div>
            {data.timeVsScore?.length ? (
              <div className="relative h-28 w-full rounded border border-border/60">
                <div className="absolute left-1 top-1 text-[10px] text-muted-foreground">High score</div>
                <div className="absolute right-1 bottom-1 text-[10px] text-muted-foreground">More time</div>
                {(data.timeVsScore ?? []).slice(-40).map((pt) => {
                  const xPct = minutesRange.max === minutesRange.min
                    ? 50
                    : ((pt.minutes - minutesRange.min) / (minutesRange.max - minutesRange.min)) * 100;
                  const yPct = (1 - clamp01(pt.score)) * 100;
                  return (
                    <div
                      key={pt.id}
                      className="absolute h-2 w-2 rounded-full bg-purpleVibe/70"
                      style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%,-50%)' }}
                      title={`${pt.minutes}m • ${pct(pt.score)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No sessions yet</div>
            )}
          </div>
        </div>
      </Card>

      {/* RECENT */}
      <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent sessions</h3>
          <Link href="/reading/dashboard">
            <Button variant="surface" size="sm" className="rounded-ds-xl">Open full page</Button>
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Types</th>
                <th className="py-2 pr-0 text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent ?? []).slice(0, 7).map((r) => (
                <tr key={r.slug} className="border-top border-border/40">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}
                  </td>
                  <td className="py-2 pr-4 truncate">{r.title}</td>
                  <td className="py-2 pr-4">{pct(r.score)}</td>
                  <td className="py-2 pr-4">{r.minutes}m</td>
                  <td className="py-2 pr-4 capitalize">{r.types.join(', ')}</td>
                  <td className="py-2 pr-0 text-right">
                    <Link href={r.hrefReview} className="inline-flex items-center gap-1 text-electricBlue hover:text-electricBlue/80">
                      Review <Icon name="ArrowRight" size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
              {!data.recent?.length && (
                <tr><td className="py-4 text-xs text-muted-foreground" colSpan={6}>No sessions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SAVED & QUEUED */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
          <h3 className="text-sm font-semibold">Saved passages</h3>
          <ul className="mt-2 space-y-2">
            {(data.saved ?? []).slice(0, 3).map((s) => (
              <li key={s.slug} className="flex items-center justify-between gap-3">
                <span className="truncate">{s.title}</span>
                <Link href={s.href}><Button variant="surface" size="sm" className="rounded-ds-xl">Continue</Button></Link>
              </li>
            ))}
            {!data.saved?.length && <li className="text-xs text-muted-foreground">Nothing saved yet</li>}
          </ul>
        </Card>

        <Card className="p-5 border-border/60 bg-white/70 backdrop-blur dark:bg-dark/70">
          <h3 className="text-sm font-semibold">Queued drills</h3>
          <ul className="mt-2 space-y-2">
            {(data.queued ?? []).slice(0, 3).map((q, idx) => (
              <li key={`${q.href}-${idx}`} className="flex items-center justify-between gap-3">
                <span className="truncate">{q.label}</span>
                <Link href={q.href}><Button variant="primary" size="sm" className="rounded-ds-xl">Start</Button></Link>
              </li>
            ))}
            {!data.queued?.length && <li className="text-xs text-muted-foreground">No queued drills</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ReadingDashboard;
