// pages/pricing/overview.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { Separator } from '@/components/design-system/Separator';

import { usePlan } from '@/hooks/usePlan';

// Optional: plan selector already in your repo
import PlanPicker from '@/components/payments/PlanPicker';

type Counter = {
  used_day?: number;
  used_month?: number;
  per_day?: number | null;
  per_month?: number | null;
};
type CountersResponse = Record<string, Counter>;

type SubscriptionSummary = {
  plan: string;            // free | starter | booster | master | ...
  status?: string;         // active | trialing | past_due | canceled
  renewsAt?: string | null;
  trialEndsAt?: string | null;
};

const USAGE_KEYS = [
  { key: 'ai.writing.grade', label: 'AI Writing Grades' },
  { key: 'ai.speaking.grade', label: 'AI Speaking Grades' },
  { key: 'ai.explain', label: 'AI Explain' },
  { key: 'mock.start', label: 'Mock Starts' },
  { key: 'mock.submit', label: 'Mock Submits' },
] as const;

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const clampRatio = (used: number, limit: number | null | undefined) => {
  if (!limit || limit <= 0) return 0;
  const pct = Math.round((used / limit) * 100);
  return Math.max(0, Math.min(100, pct));
};

const QuotaRow: React.FC<{ label: string; day?: Counter; month?: Counter }> = ({ label, day, month }) => {
  const usedDay = day?.used_day ?? 0;
  const limitDay = day?.per_day ?? null;
  const usedMonth = month?.used_month ?? 0;
  const limitMonth = month?.per_month ?? null;

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base md:text-lg text-token-foreground-strong">{label}</div>
          <div className="text-sm text-token-foreground-muted">Daily {limitDay ?? '∞'} • Monthly {limitMonth ?? '∞'}</div>
        </div>
        <Badge variant="surface">Usage</Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-xs mb-1">Today: {usedDay}/{limitDay ?? '∞'}</div>
          <ProgressBar value={clampRatio(usedDay, limitDay)} />
        </div>
        <div>
          <div className="text-xs mb-1">This month: {usedMonth}/{limitMonth ?? '∞'}</div>
          <ProgressBar value={clampRatio(usedMonth, limitMonth)} />
        </div>
      </div>
    </Card>
  );
};

const PricingOverviewPage: React.FC = () => {
  const { plan: hookPlan } = usePlan(); // normalized: 'free' | 'starter' | 'booster' | 'master'
  const [counters, setCounters] = useState<CountersResponse>({});
  const [sub, setSub] = useState<SubscriptionSummary | null>(null);

  const planLabel = (hookPlan ?? sub?.plan ?? 'free').toString();

  // Counters (non-fatal if unauthenticated)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/counters', { credentials: 'include' });
        // @ts-expect-error TODO: type /api/counters response
        const json = await r.json();
        if (!cancelled && json) setCounters(json?.counters ?? json ?? {});
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Subscription summary (non-fatal if unauthenticated)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/subscriptions', { credentials: 'include' });
        // @ts-expect-error TODO: type /api/subscriptions response
        const data = await r.json();
        if (cancelled) return;
        const normalized: SubscriptionSummary = {
          plan: (data?.plan || data?.tier || data?.subscription?.plan || 'free').toString(),
          status: data?.status || data?.subscription?.status,
          renewsAt: data?.renewsAt || data?.subscription?.current_period_end || null,
          trialEndsAt: data?.trialEndsAt || data?.subscription?.trial_end || null,
        };
        setSub(normalized);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    return USAGE_KEYS.map(k => {
      const c = counters[k.key] || {};
      return {
        label: k.label,
        day: { used_day: c.used_day ?? 0, per_day: c.per_day ?? null },
        month: { used_month: c.used_month ?? 0, per_month: c.per_month ?? null },
      };
    });
  }, [counters]);

  return (
    <>
      <Head>
        <title>Pricing Overview · GramorX</title>
        <meta name="description" content="See your current plan, usage quotas, and compare pricing tiers." />
      </Head>

      <Container className="py-8 md:py-10">
        <Section className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-medium">Pricing Overview</h1>
              <p className="text-sm text-token-foreground-muted mt-1">
                Your current plan, quotas and upgrade options.
              </p>
            </div>
            <Badge variant="brand">{planLabel.toUpperCase()}</Badge>
          </div>

          {/* Your Plan */}
          <Card className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>{sub?.status ?? 'active'}</Badge>
              <Separator className="hidden md:block" />
              <div className="text-sm">
                <span className="text-token-foreground-muted">Renews: </span>
                <span className="font-medium">{fmtDate(sub?.renewsAt)}</span>
              </div>
              <div className="text-sm">
                <span className="text-token-foreground-muted">Trial ends: </span>
                <span className="font-medium">{fmtDate(sub?.trialEndsAt)}</span>
              </div>
              <div className="ml-auto flex gap-2">
                <Link href="/pricing" passHref legacyBehavior>
                  <Button asChild variant="primary">
                    <a>Compare plans</a>
                  </Button>
                </Link>
                <Link href="/account/billing" passHref legacyBehavior>
                  <Button asChild variant="surface">
                    <a>Manage billing</a>
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Quotas Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {rows.map((r) => (
              <QuotaRow key={r.label} label={r.label} day={r.day} month={r.month} />
            ))}
          </div>

          {/* Plan Comparison */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base md:text-lg font-medium">Plans</div>
                <div className="text-sm text-token-foreground-muted">Pick the limits that fit your study pace.</div>
              </div>
              <Link href="/pricing" passHref legacyBehavior>
                <Button asChild><a>View full pricing</a></Button>
              </Link>
            </div>
            <div className="mt-4">
              {/* Reuse your existing selector */}
              <PlanPicker />
            </div>
          </Card>
        </Section>
      </Container>
    </>
  );
};

export default PricingOverviewPage;

/**
 * Route map tip:
 * Add to lib/routes/routeLayoutMap.ts
 *   '/pricing/overview': { layout: 'marketing' },
 */
