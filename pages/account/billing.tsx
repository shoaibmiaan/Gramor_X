// pages/account/billing.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';

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
  status:
    | 'active'
    | 'trialing'
    | 'canceled'
    | 'incomplete'
    | 'past_due'
    | 'unpaid'
    | 'paused';
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
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return { props: {} };
};

const toTitleCase = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusVariant = (status: Summary['status']) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'incomplete':
      return 'warning';
    case 'unpaid':
      return 'danger';
    case 'paused':
      return 'secondary';
    case 'canceled':
    default:
      return 'neutral';
  }
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

// ------------------- Client component -------------------
export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [dues, setDues] = React.useState<Due[]>([]);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [portalAvailable, setPortalAvailable] = React.useState(true);

  // 👇 new: detect vaulted flag from query (means user just saved a card)
  const justVaulted = router.query.vaulted === '1';

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    []
  );
  const dateTimeFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    []
  );
  const currencyFormatter = React.useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount),
    []
  );

  const formatDate = React.useCallback(
    (value?: string | null) =>
      value ? dateFormatter.format(new Date(value)) : null,
    [dateFormatter]
  );
  const formatDateTime = React.useCallback(
    (value: string) => dateTimeFormatter.format(new Date(value)),
    [dateTimeFormatter]
  );

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch('/api/billing/summary', { credentials: 'include' });
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
    const renews = formatDate(summary?.renewsAt);
    const trialEnds = formatDate(summary?.trialEndsAt);
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
        <title>Billing · GramorX</title>
        <meta
          name="description"
          content="Manage your subscription, invoices, and pending dues."
        />
      </Head>

      <main className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container className="max-w-4xl space-y-6">
          <header className="space-y-1">
            <h1 className="text-h2 font-semibold text-foreground">Billing</h1>
            <p className="text-small text-muted-foreground">
              Manage your plan and invoices.
            </p>
          </header>

          {loading && (
            <Card padding="lg" insetBorder aria-busy="true">
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3 rounded-ds-xl" />
                <Skeleton className="h-10 w-full rounded-ds-xl" />
                <Skeleton className="h-10 w-5/6 rounded-ds-xl" />
              </div>
            </Card>
          )}

          {!loading && error && (
            <Alert
              variant="error"
              appearance="soft"
              title="Couldn’t load billing"
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">{error}</p>
              <div className="mt-3">
                <Button asChild variant="link" size="sm">
                  <Link href="/pricing">Go to pricing</Link>
                </Button>
              </div>
            </Alert>
          )}

          {!loading && !error && summary && (
            <>
              {/* Current plan */}
              <Card
                as="section"
                padding="lg"
                insetBorder
                aria-labelledby="current-plan-heading"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div>
                      <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">
                        Current plan
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <h2
                          id="current-plan-heading"
                          className="text-h3 font-semibold capitalize text-foreground"
                        >
                          {toTitleCase(summary.plan)}
                        </h2>
                        <Badge variant={getStatusVariant(summary.status)}>
                          {toTitleCase(summary.status)}
                        </Badge>
                      </div>
                    </div>
                    {renderPlanMeta()}
                  </div>

                  {portalAvailable ? (
                    <Button
                      onClick={openPortal}
                      loading={portalLoading}
                      size="lg"
                    >
                      {portalLoading ? 'Opening…' : 'Manage billing'}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="lg">
                      <Link href="/pricing">Change plan</Link>
                    </Button>
                  )}
                </div>

                {/* ⚠️ Only show this warning if user just vaulted */}
                {justVaulted && (
                  <Alert variant="warning" className="mt-4" appearance="soft">
                    Payments are temporarily unavailable. If you recently
                    subscribed, your card was{' '}
                    <span className="font-medium">not charged</span> and the
                    amount is marked as{' '}
                    <span className="font-medium">due</span>. We’ll notify you
                    before retrying payment.
                  </Alert>
                )}
              </Card>

              {/* Pending dues */}
              {dues.length > 0 && (
                <Card
                  as="section"
                  padding="lg"
                  insetBorder
                  aria-labelledby="pending-dues"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2
                        id="pending-dues"
                        className="text-h4 font-semibold text-foreground"
                      >
                        Pending dues
                      </h2>

                      {/* 👇 New “Pay with card” button */}
                      <Button asChild size="sm">
                        <Link
                          href={{
                            pathname: '/checkout/save-card',
                            query: {
                              plan: summary.plan,
                              cycle: 'monthly',
                              due: '1',
                            },
                          }}
                        >
                          Pay with card
                        </Link>
                      </Button>
                    </div>

                    <ul className="space-y-3">
                      {dues.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-ds-xl border border-border/60 bg-background p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                              <Badge variant={getDueVariant(d.status)}>
                                {toTitleCase(d.status)}
                              </Badge>
                              <div className="text-small text-muted-foreground">
                                {toTitleCase(d.plan_key)} ·{' '}
                                {toTitleCase(d.cycle)}
                              </div>
                              <div className="text-caption text-muted-foreground">
                                {formatDateTime(d.created_at)}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-h4 font-semibold text-foreground">
                                {currencyFormatter(
                                  d.amount_cents / 100,
                                  d.currency
                                )}
                              </p>
                              <p className="text-caption text-muted-foreground">
                                Not charged yet
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              )}

              {/* Invoices */}
              <Card
                as="section"
                padding="lg"
                insetBorder
                aria-labelledby="invoices-heading"
              >
                <div className="space-y-4">
                  <h2
                    id="invoices-heading"
                    className="text-h4 font-semibold text-foreground"
                  >
                    Invoices
                  </h2>
                  {invoices.length === 0 ? (
                    <p className="text-small text-muted-foreground">
                      No invoices yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {invoices.map((inv) => (
                        <li
                          key={inv.id}
                          className="rounded-ds-xl border border-border/60 bg-background p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                              <Badge variant={getInvoiceVariant(inv.status)}>
                                {toTitleCase(inv.status)}
                              </Badge>
                              <p className="text-caption text-muted-foreground">
                                {formatDateTime(inv.createdAt)}
                              </p>
                            </div>
                            <div className="text-right space-y-2">
                              <p className="text-h4 font-semibold text-foreground">
                                {currencyFormatter(inv.amount / 100, inv.currency)}
                              </p>
                              {inv.hostedInvoiceUrl ? (
                                <Button asChild variant="link" size="sm">
                                  <a
                                    href={inv.hostedInvoiceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View invoice
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-caption text-muted-foreground">
                                  No PDF
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </>
          )}

          {!loading && !error && !summary && (
            <Alert variant="info" appearance="soft" title="No subscription data">
              We couldn’t find an active subscription yet. Start a plan from the
              pricing page when you’re ready.
            </Alert>
          )}
        </Container>
      </main>
    </>
  );
}
