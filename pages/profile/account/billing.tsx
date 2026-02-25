import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';

import { getServerClient } from '@/lib/supabaseServer';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/design-system/Card';
import { Heading } from '@/components/design-system/Heading';
import { Section } from '@/components/design-system/Section';
import { SectionLabel } from '@/components/design-system/SectionLabel';
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

  const providerValue = router.query['provider'];
  const providerParam = Array.isArray(providerValue)
    ? providerValue[0] ?? null
    : typeof providerValue === 'string'
    ? providerValue
    : null;

  const statusValue = router.query['status'];
  const statusParam = Array.isArray(statusValue)
    ? statusValue[0] ?? null
    : typeof statusValue === 'string'
    ? statusValue
    : null;

  const reasonValue = router.query['reason'];
  const reasonParam = Array.isArray(reasonValue)
    ? reasonValue[0] ?? null
    : typeof reasonValue === 'string'
    ? reasonValue
    : null;

  const setupValue = router.query['setup'];
  const setupParam = Array.isArray(setupValue)
    ? setupValue[0] ?? null
    : typeof setupValue === 'string'
    ? setupValue
    : null;

  const safepayStatus = providerParam === 'safepay' ? statusParam : null;
  const safepayReason = providerParam === 'safepay' ? reasonParam : null;
  const showSafepaySetup =
    providerParam === 'safepay' &&
    (setupParam === '1' || setupParam === 'true');
  const showSafepayPending = safepayStatus === 'pending';
  const showSafepayCancelled =
    safepayStatus === 'cancelled' || safepayStatus === 'canceled';
  const showSafepayFailed = safepayStatus === 'failed';
  const showSafepayError = safepayStatus === 'error';

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    [],
  );
  const dateTimeFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );
  const currencyFormatter = React.useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      }).format(amount),
    [],
  );

  const formatDate = React.useCallback(
    (value?: string | null) =>
      value ? dateFormatter.format(new Date(value)) : null,
    [dateFormatter],
  );
  const formatDateTime = React.useCallback(
    (value: string) => dateTimeFormatter.format(new Date(value)),
    [dateTimeFormatter],
  );

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
        <title>Billing · Account · GramorX</title>
        <meta
          name="description"
          content="Manage your subscription, invoices, and pending dues for your GramorX account."
        />
      </Head>

      <main className="min-h-screen bg-background text-foreground">
        <Section
          className="bg-background"
          Container
          containerClassName="max-w-5xl space-y-8 py-10"
        >
          <header className="space-y-2">
            <Heading as="h1" size="lg" className="text-foreground">
              Billing
            </Heading>
            <p className="text-small text-muted-foreground">
              Manage your plan, invoices, and local payment activity.
            </p>
          </header>

          {showSafepaySetup && (
            <Alert
              variant="warning"
              appearance="soft"
              title="Safepay requires configuration"
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                Safepay is running in developer mode. Add your Safepay public
                and secret keys to enable the live checkout experience.
              </p>
              <p className="mt-2 text-caption text-muted-foreground">
                Update <code>SAFEPAY_PUBLIC_KEY</code> and{' '}
                <code>SAFEPAY_SECRET_KEY</code> in your environment, then
                restart the app.
              </p>
            </Alert>
          )}

          {showSafepayPending && (
            <Alert
              variant="info"
              appearance="soft"
              title="Safepay payment pending"
              role="status"
            >
              <p className="mt-2 text-small text-muted-foreground">
                We have not received confirmation from Safepay yet. You will
                get an email once the payment completes.
              </p>
            </Alert>
          )}

          {showSafepayCancelled && (
            <Alert
              variant="warning"
              appearance="soft"
              title="Safepay checkout cancelled"
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                Your Safepay session was cancelled before payment was
                completed. Start a new checkout to try again.
              </p>
            </Alert>
          )}

          {showSafepayFailed && (
            <Alert
              variant="error"
              appearance="soft"
              title="Safepay payment failed"
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {safepayReason
                  ? safepayReason
                  : 'Safepay reported that the payment could not be completed. Try again or choose another method.'}
              </p>
            </Alert>
          )}

          {showSafepayError && (
            <Alert
              variant="error"
              appearance="soft"
              title="Safepay verification error"
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                We could not verify the Safepay callback. If you completed the
                payment, contact support with your receipt.
              </p>
            </Alert>
          )}

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
            <div className="space-y-6">
              <Card
                as="section"
                padding="none"
                insetBorder
                aria-labelledby="current-plan-heading"
              >
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <SectionLabel>Current plan</SectionLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      <Heading
                        as="h2"
                        size="sm"
                        id="current-plan-heading"
                        className="capitalize text-foreground"
                      >
                        {toTitleCase(summary.plan)}
                      </Heading>
                      <Badge variant={getStatusVariant(summary.status)}>
                        {toTitleCase(summary.status)}
                      </Badge>
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
                </CardHeader>

                {(justVaulted || !portalAvailable) && (
                  <CardContent className="space-y-3 pt-0">
                    {!portalAvailable && (
                      <Alert
                        variant="info"
                        appearance="soft"
                        title="Billing portal unavailable"
                      >
                        <p className="mt-1 text-small text-muted-foreground">
                          The hosted Stripe portal is temporarily offline. Email{' '}
                          <a
                            className="underline"
                            href="mailto:support@gramorx.com"
                          >
                            support@gramorx.com
                          </a>{' '}
                          to update or cancel your subscription.
                        </p>
                      </Alert>
                    )}

                    {justVaulted && (
                      <Alert
                        variant="warning"
                        appearance="soft"
                        title="Card saved — payment due later"
                      >
                        <p className="mt-1 text-small text-muted-foreground">
                          Payments are temporarily unavailable. If you recently
                          subscribed, your card was{' '}
                          <span className="font-medium">not charged</span> and
                          the amount is marked as{' '}
                          <span className="font-medium">due</span>. We’ll
                          notify you before retrying payment.
                        </p>
                      </Alert>
                    )}
                  </CardContent>
                )}
              </Card>

              {dues.length > 0 && (
                <Card
                  as="section"
                  padding="none"
                  insetBorder
                  aria-labelledby="pending-dues"
                >
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <SectionLabel>Local payments</SectionLabel>
                      <Heading
                        as="h2"
                        size="xs"
                        id="pending-dues"
                        className="text-foreground"
                      >
                        Pending dues
                      </Heading>
                    </div>
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
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {dues.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-ds-xl border border-border/60 bg-surface p-4"
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
                            <div className="space-y-1 text-right">
                              <p className="text-h4 font-semibold text-foreground">
                                {currencyFormatter(
                                  d.amount_cents / 100,
                                  d.currency,
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
                  </CardContent>
                </Card>
              )}

              <Card
                as="section"
                padding="none"
                insetBorder
                aria-labelledby="invoices-heading"
              >
                <CardHeader>
                  <div>
                    <SectionLabel>History</SectionLabel>
                    <Heading
                      as="h2"
                      size="xs"
                      id="invoices-heading"
                      className="text-foreground"
                    >
                      Invoices
                    </Heading>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-small text-muted-foreground">
                      No invoices yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {invoices.map((inv) => (
                        <li
                          key={inv.id}
                          className="rounded-ds-xl border border-border/60 bg-surface p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-2">
                              <Badge
                                variant={getInvoiceVariant(inv.status)}
                              >
                                {toTitleCase(inv.status)}
                              </Badge>
                              <p className="text-caption text-muted-foreground">
                                {formatDateTime(inv.createdAt)}
                              </p>
                            </div>
                            <div className="space-y-2 text-right">
                              <p className="text-h4 font-semibold text-foreground">
                                {currencyFormatter(
                                  inv.amount / 100,
                                  inv.currency,
                                )}
                              </p>
                              {inv.hostedInvoiceUrl ? (
                                <Button
                                  asChild
                                  variant="link"
                                  size="sm"
                                >
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
                </CardContent>
              </Card>
            </div>
          )}

          {!loading && !error && !summary && (
            <Alert
              variant="info"
              appearance="soft"
              title="No subscription data"
            >
              We couldn’t find an active subscription yet. Start a plan from
              the pricing page when you’re ready.
            </Alert>
          )}
        </Section>
      </main>
    </>
  );
}
