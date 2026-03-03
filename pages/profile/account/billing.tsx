import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

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

const formatCurrency = (amount: number, currency = 'USD') => {
  const normalized = (currency || 'USD').toUpperCase();
  const value = amount > 999 ? amount / 100 : amount;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: normalized,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${normalized}`;
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

  return (
    <>
      <Head>
        <title>Billing · Account · GramorX</title>
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <Section className="bg-background" Container containerClassName="max-w-5xl space-y-6 py-24">
          <Card className="rounded-ds-2xl border border-border/80 p-4 shadow-sm sm:p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Heading as="h1" size="lg">
                  Billing
                </Heading>
                <p className="text-small text-muted-foreground">Manage your plan, dues, and invoices.</p>
              </div>
              <Button variant="ghost" onClick={() => router.push('/profile/subscription')}>
                Back to subscription
              </Button>
            </div>

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
              <div className="space-y-6">
                <Card insetBorder>
                  <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <SectionLabel>Subscription</SectionLabel>
                      <Heading as="h2" size="sm" className="capitalize">
                        {formatSubscriptionLabel(summary.plan)}
                      </Heading>
                      <Badge variant={getSubscriptionStatusVariant(summary.status)}>
                        {formatSubscriptionLabel(summary.status)}
                      </Badge>
                      <p className="text-small text-muted-foreground">
                        {summary.renewsAt && <span>Renews {formatDateLabel(summary.renewsAt)}</span>}
                        {summary.renewsAt && summary.trialEndsAt && <span aria-hidden="true"> · </span>}
                        {summary.trialEndsAt && <span>Trial ends {formatDateLabel(summary.trialEndsAt)}</span>}
                      </p>
                    </div>

                    {portalAvailable && (
                      <Button onClick={openPortal} loading={portalLoading}>
                        {portalLoading ? 'Opening…' : 'Manage billing'}
                      </Button>
                    )}
                  </CardHeader>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card insetBorder>
                    <CardHeader>
                      <Heading as="h3" size="xs">
                        Open dues
                      </Heading>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dues.length === 0 && (
                        <p className="text-small text-muted-foreground">No open dues.</p>
                      )}
                      {dues.map((due) => (
                        <div
                          key={due.id}
                          className="flex items-center justify-between rounded-ds-xl border border-border/80 p-3"
                        >
                          <div>
                            <p className="text-small font-semibold capitalize">
                              {due.plan_key} · {due.cycle}
                            </p>
                            <p className="text-caption text-muted-foreground">
                              {formatDateLabel(due.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getDueVariant(due.status)}>{due.status}</Badge>
                            <span className="text-small font-semibold">
                              {formatCurrency(due.amount_cents, due.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card insetBorder>
                    <CardHeader>
                      <Heading as="h3" size="xs">
                        Invoice history
                      </Heading>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {invoices.length === 0 && (
                        <p className="text-small text-muted-foreground">No invoices yet.</p>
                      )}
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between rounded-ds-xl border border-border/80 p-3"
                        >
                          <div>
                            <p className="text-small font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                            <p className="text-caption text-muted-foreground">
                              {formatDateLabel(invoice.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getInvoiceVariant(invoice.status)}>{invoice.status}</Badge>
                            {invoice.hostedInvoiceUrl && (
                              <a
                                href={invoice.hostedInvoiceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-caption font-semibold text-primary underline-offset-2 hover:underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </Section>
      </main>
    </>
  );
}
