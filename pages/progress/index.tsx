'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Badge } from '@/components/design-system/Badge';
import type { ProgressTrendPayload, SkillAverage, LexicalEstimate } from '@/lib/analytics/progress';

const TrendLineChart = dynamic(
  () => import('@/components/progress/TrendCharts').then((mod) => mod.TrendLineChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const SkillAreaChart = dynamic(
  () => import('@/components/progress/TrendCharts').then((mod) => mod.SkillAreaChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to load progress trends');
  return res.json();
});

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

export default function ProgressPage() {
  const { data, error, isLoading } = useSWR<ProgressTrendPayload>('/api/progress', fetcher);

  const timeline = data?.timeline ?? [];
  const perSkill = data?.perSkill ?? [];
  const totalAttempts = data?.totalAttempts ?? 0;
  const lexicalEstimate = data?.lexicalEstimate ?? null;
  const hasData = timeline.length > 0 || perSkill.length > 0;

  const exportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'progress-trends.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push('timeline');
    lines.push('week_start,reading,listening,writing,speaking');
    data.timeline.forEach((point) => {
      lines.push([
        point.weekStart,
        formatCsvValue(point.reading),
        formatCsvValue(point.listening),
        formatCsvValue(point.writing),
        formatCsvValue(point.speaking),
      ].join(','));
    });
    lines.push('');
    lines.push('per_skill');
    lines.push('skill,average,delta,samples');
    data.perSkill.forEach((entry) => {
      lines.push([
        entry.skill,
        entry.average.toFixed(2),
        entry.delta.toFixed(2),
        String(entry.samples),
      ].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'progress-trends.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="py-10">
      <Container>
        <Card className="rounded-ds-2xl border border-border bg-card p-6 text-card-foreground">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-slab text-h2 text-foreground">Progress trends</h1>
              <p className="text-small text-muted-foreground">
                Weekly band averages and per-skill momentum from your recent practice.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={exportCSV} disabled={!data}>
                Export CSV
              </Button>
              <Button variant="secondary" onClick={exportJSON} disabled={!data}>
                Export JSON
              </Button>
            </div>
          </header>

          {isLoading ? (
            <ChartSkeleton large />
          ) : error ? (
            <div className="rounded-ds-xl border border-danger/30 bg-danger/10 p-4 text-danger">
              Unable to load progress trends. Please try again later.
            </div>
          ) : !hasData ? (
            <EmptyState
              title="No progress yet"
              description="Complete a mock or quick drill to start tracking your weekly trends."
              actionLabel="Browse practice"
              onAction={() => window.open('/learning', '_self')}
            />
          ) : (
            <div className="space-y-10">
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-slab text-h3 text-foreground">Weekly band trend</h2>
                  <span className="text-caption text-muted-foreground">
                    Aggregated from {totalAttempts} recent attempts.
                  </span>
                </div>
                <TrendLineChart data={timeline} />
              </section>

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-slab text-h3 text-foreground">Per-skill averages</h2>
                  <span className="text-caption text-muted-foreground">
                    Change compares the latest week with the one before it.
                  </span>
                </div>
                <SkillAreaChart data={perSkill} />
                <SkillSummary data={perSkill} />
              </section>

              {lexicalEstimate && <LexicalResourcePanel estimate={lexicalEstimate} />}
            </div>
          )}
        </Card>
      </Container>
    </section>
  );
}

function SkillSummary({ data }: { data: SkillAverage[] }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((entry) => {
        const trend = classifyDelta(entry.delta);
        return (
          <div
            key={entry.skill}
            className="rounded-ds-xl border border-border/60 bg-card/40 p-4"
            aria-label={`${formatSkill(entry.skill)} average ${numberFormatter.format(entry.average)} band`}
          >
            <div className="text-caption uppercase tracking-[0.12em] text-muted-foreground">
              {formatSkill(entry.skill)}
            </div>
            <div className="mt-1 text-h3 font-semibold text-foreground">
              {numberFormatter.format(entry.average)}
            </div>
            <div
              className={`text-caption ${
                trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted-foreground'
              }`}
            >
              {trend === 'flat'
                ? 'No week-over-week change'
                : `${trend === 'up' ? '+' : ''}${numberFormatter.format(entry.delta)} vs previous week`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LexicalResourcePanel({ estimate }: { estimate: LexicalEstimate }) {
  const progressToBand6 = estimate.thresholds.band6
    ? Math.min(100, Math.round((estimate.estimatedWordFamilies / estimate.thresholds.band6) * 100))
    : 0;
  const progressToBand7 = estimate.thresholds.band7
    ? Math.min(100, Math.round((estimate.estimatedWordFamilies / estimate.thresholds.band7) * 100))
    : 0;
  const target = estimate.goalBand && estimate.goalBand >= 7 ? estimate.thresholds.band7 : estimate.thresholds.band6;
  const targetLabel = estimate.goalBand && estimate.goalBand >= 7 ? 'Target band goal' : 'Band 6 baseline';
  const progressToTarget = target
    ? Math.min(100, Math.round((estimate.estimatedWordFamilies / target) * 100))
    : 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-slab text-h3 text-foreground">Lexical Resource trajectory</h2>
        <span className="text-caption text-muted-foreground">
          Band 6 ≈ {estimate.thresholds.band6.toLocaleString()} wf · Band 7 ≈ {estimate.thresholds.band7.toLocaleString()} wf
        </span>
      </div>

      <div className="rounded-ds-xl border border-border/60 bg-card/40 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Estimated word families</div>
            <div className="text-h3 font-semibold text-foreground">
              {estimate.estimatedWordFamilies.toLocaleString()}
            </div>
            <div className="text-caption text-muted-foreground">
              Based on {estimate.mastered.toLocaleString()} mastered collocations.
            </div>
          </div>
          <Badge variant="info" size="sm">{estimate.estimatedBandRange.label}</Badge>
        </div>

        <div className="space-y-3">
          <LexicalProgressBar label={`${targetLabel} (${target.toLocaleString()} wf)`} value={progressToTarget} />
          <LexicalProgressBar label={`Band 6 proxy (${estimate.thresholds.band6.toLocaleString()} wf)`} value={progressToBand6} />
          <LexicalProgressBar label={`Band 7 proxy (${estimate.thresholds.band7.toLocaleString()} wf)`} value={progressToBand7} />
        </div>

        <p className="text-caption text-muted-foreground">
          This vocabulary proxy helps you monitor Lexical Resource, but examiners also judge Task Response, Coherence, and
          Grammar. Use the estimate as guidance, not a guarantee.
        </p>
      </div>
    </section>
  );
}

function LexicalProgressBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-border/40" role="presentation">
        {/* eslint-disable-next-line ds-guard/no-inline-style */}
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function classifyDelta(delta: number): 'up' | 'down' | 'flat' {
  const threshold = 0.05;
  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'flat';
}

function formatSkill(skill: string): string {
  return skill
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCsvValue(value: number | undefined): string {
  return typeof value === 'number' && !Number.isNaN(value) ? value.toFixed(2) : '';
}

function ChartSkeleton({ large = false }: { large?: boolean }) {
  return (
    <div className={`w-full ${large ? 'space-y-4' : ''}`}>
      <div className="h-8 w-32 animate-pulse rounded bg-border/50" />
      <div className="h-64 w-full animate-pulse rounded-ds-xl bg-border/30" />
      {large && <div className="h-64 w-full animate-pulse rounded-ds-xl bg-border/20" />}
    </div>
  );
}
