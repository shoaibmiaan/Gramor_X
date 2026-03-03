// pages/pricing/overview.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import { usePlan } from '@/hooks/usePlan';

import PlanPicker from '@/components/payments/PlanPicker';

type Counter = {
  used_day?: number;
  used_month?: number;
  per_day?: number | null;
  per_month?: number | null;
};
type CountersResponse = Record<string, Counter>;

type SubscriptionSummary = {
  plan: string;
  status?: string;
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

const statusLabel = (status?: string) => {
  if (!status) return 'active';
  return status.replace(/_/g, ' ');
};

const QuotaRow: React.FC<{ label: string; day?: Counter; month?: Counter }> = ({ label, day, month }) => {
  const usedDay = day?.used_day ?? 0;
  const limitDay = day?.per_day ?? null;
  const usedMonth = month?.used_month ?? 0;
  const limitMonth = month?.per_month ?? null;

  return (
    <Card className="rounded-ds-xl border border-border/80 p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-small font-semibold text-foreground">{label}</p>
          <p className="text-caption text-muted-foreground">
            Daily {limitDay ?? '∞'} • Monthly {limitMonth ?? '∞'}
          </p>
        </div>
        <Badge variant="surface">Usage</Badge>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 text-caption text-muted-foreground">
            Today: {usedDay}/{limitDay ?? '∞'}
          </p>
          <ProgressBar value={clampRatio(usedDay, limitDay)} />
        </div>
        <div>
          <p className="mb-1 text-caption text-muted-foreground">
            This month: {usedMonth}/{limitMonth ?? '∞'}
          </p>
          <ProgressBar value={clampRatio(usedMonth, limitMonth)} />
        </div>
      </div>
    </Card>
  );
};

const PricingOverviewPage: React.FC = () => {
  const router = useRouter();
  const { plan: hookPlan } = usePlan();
  const [counters, setCounters] = useState<CountersResponse>({});
  const [sub, setSub] = useState<SubscriptionSummary | null>(null);

  const planLabel = (hookPlan ?? sub?.plan ?? 'free').toString();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/counters', { credentials: 'include' });
        // @ts-expect-error TODO: type /api/counters response
        const json = await r.json();
        if (!cancelled && json) setCounters(json?.counters ?? json ?? {});
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () =>
      USAGE_KEYS.map((k) => {
        const c = counters[k.key] || {};
        return {
          label: k.label,
          day: { used_day: c.used_day ?? 0, per_day: c.per_day ?? null },
          month: { used_month: c.used_month ?? 0, per_month: c.per_month ?? null },
        };
      }),
    [counters],
  );

  return (
    <>
      <Head>
        <title>Pricing Overview · GramorX</title>
        <meta name="description" content="See your current plan, usage quotas, and compare pricing tiers." />
      </Head>

      <section className="bg-background py-24 text-foreground">
        <Container>
          <Section className="mx-auto max-w-5xl space-y-6">
            <Card className="rounded-ds-2xl border border-border/80 p-4 shadow-sm sm:p-6">
              <div className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="font-slab text-display">Pricing Overview</h1>
                  <p className="text-small text-muted-foreground">
                    Your current plan, quotas, and upgrade options.
                  </p>
                </div>
                <Badge variant="brand">{planLabel.toUpperCase()}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-ds-xl border border-border/80 bg-background p-3">
                  <p className="text-caption text-muted-foreground">Current plan</p>
                  <p className="text-small font-semibold capitalize">{planLabel}</p>
                </div>
                <div className="rounded-ds-xl border border-border/80 bg-background p-3">
                  <p className="text-caption text-muted-foreground">Status</p>
                  <p className="text-small font-semibold capitalize">{statusLabel(sub?.status)}</p>
                </div>
                <div className="rounded-ds-xl border border-border/80 bg-background p-3">
                  <p className="text-caption text-muted-foreground">Renews</p>
                  <p className="text-small font-semibold">{fmtDate(sub?.renewsAt)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-border/80 pt-4">
                <Button variant="primary" onClick={() => router.push('/pricing')}>
                  Compare plans
                </Button>
                <Button variant="outline" onClick={() => router.push('/profile/account/billing')}>
                  Manage billing
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {rows.map((r) => (
                <QuotaRow key={r.label} label={r.label} day={r.day} month={r.month} />
              ))}
            </div>

            <Card className="rounded-ds-2xl border border-border/80 p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-small font-semibold">Plans</p>
                  <p className="text-caption text-muted-foreground">
                    Pick the limits that fit your study pace.
                  </p>
                </div>
                <Button onClick={() => router.push('/pricing')}>View full pricing</Button>
              </div>
              <div className="mt-4 border-t border-border/80 pt-4">
                <PlanPicker />
              </div>
            </Card>
          </Section>
        </Container>
      </section>
    </>
  );
};

export default PricingOverviewPage;
