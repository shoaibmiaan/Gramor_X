import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';

import { getServerClient } from '@/lib/supabaseServer';
import { createAuthRedirect } from '@/lib/requirePageAuth';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card, CardContent, CardHeader } from '@/components/design-system/Card';
import { Heading } from '@/components/design-system/Heading';
import { Section } from '@/components/design-system/Section';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Skeleton } from '@/components/design-system/Skeleton';

import {
  formatDateLabel,
  formatSubscriptionLabel,
  getSubscriptionStatusVariant,
  type SubscriptionStatus,
} from '@/lib/subscription';

type Invoice = {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
};

type Summary = {
  plan: 'free' | 'starter' | 'booster' | 'master';
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
};

type Due = {
  id: string;
  amount_cents: number;
  currency: string;
  created_at: string;
  status: 'due' | 'collected' | 'canceled';
  plan_key: 'starter' | 'booster' | 'master';
  cycle: 'monthly' | 'annual';
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { req, res, resolvedUrl } = ctx;
  const supabase = getServerClient(req, res);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return createAuthRedirect(resolvedUrl);
  }

  return { props: {} };
};

const getInvoiceVariant = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'success';
    case 'open':
      return 'info';
    case 'draft':
      return 'secondary';
    case 'uncollectible':
      return 'danger';
    case 'void':
    default:
      return 'neutral';
  }
};

const getDueVariant = (status: Due['status']) => {
  switch (status) {
    case 'due':
      return 'warning';
    case 'collected':
      return 'success';
    case 'canceled':
    default:
      return 'neutral';
  }
};

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [dues, setDues] = React.useState<Due[]>([]);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [portalAvailable, setPortalAvailable] = React.useState(true);

  const justVaulted = router.query.vaulted === '1';

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const r = await fetch('/api/billing/summary', {
          credentials: 'include',
        });

        const j = await r.json();
        if (!j.ok) throw new Error(j.error || 'Failed to load subscription');

        setSummary(j.summary as Summary);
        setInvoices((j.invoices ?? []) as Invoice[]);
        setDues((j.dues ?? []) as Due[]);
        setPortalAvailable(!j.needsStripeSetup);
      } catch (e) {
        setError((e as Error).message || 'Failed to load subscription');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openPortal() {
    try {
      setPortalLoading(true);
      const r = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || 'Failed to open portal');
      window.location.href = j.url as string;
    } catch (e) {
      setError((e as Error).message);
      setPortalLoading(false);
    }
  }

  const renderPlanMeta = () => {
    const renews = formatDateLabel(summary?.renewsAt);
    const trialEnds = formatDateLabel(summary?.trialEndsAt);
    if (!renews && !trialEnds) return null;

    return (
      <p className="text-small text-muted-foreground">
        {renews && <span>Renews {renews}</span>}
        {renews && trialEnds && <span aria-hidden="true"> · </span>}
        {trialEnds && <span>Trial ends {trialEnds}</span>}
      </p>
    );
  };

  return (
    <>
      <Head>
        <title>Billing · Account · GramorX</title>
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <Section className="bg-background" Container containerClassName="max-w-5xl space-y-8 py-10">
          <header className="space-y-2">
            <Heading as="h1" size="lg">
              Billing
            </Heading>
            <p className="text-small text-muted-foreground">
              Manage your plan and invoices.
            </p>
          </header>

          {loading && (
            <Card padding="lg" insetBorder aria-busy="true">
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3 rounded-ds-xl" />
                <Skeleton className="h-10 w-full rounded-ds-xl" />
              </div>
            </Card>
          )}

          {!loading && error && (
            <Alert variant="error" appearance="soft" title="Couldn’t load billing">
              <p className="mt-2 text-small text-muted-foreground">{error}</p>
            </Alert>
          )}

          {!loading && !error && summary && (
            <Card insetBorder>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <Heading as="h2" size="sm" className="capitalize">
                    {formatSubscriptionLabel(summary.plan)}
                  </Heading>
                  <Badge variant={getSubscriptionStatusVariant(summary.status)}>
                    {formatSubscriptionLabel(summary.status)}
                  </Badge>
                  {renderPlanMeta()}
                </div>

                {portalAvailable && (
                  <Button onClick={openPortal} loading={portalLoading}>
                    {portalLoading ? 'Opening…' : 'Manage billing'}
                  </Button>
                )}
              </CardHeader>
            </Card>
          )}
        </Section>
      </main>
    </>
  );
}
