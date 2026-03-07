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
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';

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

const getStatusVariant = (status: Summary['status']): React.ComponentProps<typeof Badge>['variant'] => {
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

const getInvoiceVariant = (status: Invoice['status']): React.ComponentProps<typeof Badge>['variant'] => {
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

const getDueVariant = (status: Due['status']): React.ComponentProps<typeof Badge>['variant'] => {
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
  const { t, locale } = useLocale();
  const { error: toastError } = useToast();

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
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale],
  );
  const dateTimeFormatter = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );
  const currencyFormatter = React.useCallback(
    (amount: number, currency: string) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount),
    [locale],
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

  // Fetch billing data
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/billing/summary', {
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('billing.error.load', 'Failed to load subscription'));
        }

        if (!data.ok) {
          throw new Error(data.error || t('billing.error.load', 'Failed to load subscription'));
        }

        if (cancelled) return;

        setSummary(data.summary as Summary);
        setInvoices((data.invoices ?? []) as Invoice[]);
        setDues((data.dues ?? []) as Due[]);
        setPortalAvailable(!data.needsStripeSetup);
      } catch (err) {
        if (cancelled) return;
        const message = (err as Error).message || t('billing.error.load', 'Failed to load subscription');
        setError(message);
        toastError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t, toastError]);

  async function openPortal() {
    try {
      setPortalLoading(true);
      setError(null);
      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || t('billing.error.portal', 'Failed to open portal'));
      }
      window.location.href = data.url as string;
    } catch (err) {
      const message = (err as Error).message || t('billing.error.portal', 'Failed to open portal');
      setError(message);
      toastError(message);
      setPortalLoading(false);
    }
  }

  const renderPlanMeta = () => {
    const renews = formatDate(summary?.renewsAt);
    const trialEnds = formatDate(summary?.trialEndsAt);
    if (!renews && !trialEnds) return null;
    return (
      <p className="text-small text-muted-foreground">
        {renews && (
          <span>
            {t('billing.renews', 'Renews {{date}}', { date: renews })}
          </span>
        )}
        {renews && trialEnds && <span aria-hidden="true"> · </span>}
        {trialEnds && (
          <span>
            {t('billing.trialEnds', 'Trial ends {{date}}', { date: trialEnds })}
          </span>
        )}
      </p>
    );
  };

  return (
    <>
      <Head>
        <title>{t('billing.pageTitle', 'Billing · Account · GramorX')}</title>
        <meta
          name="description"
          content={t(
            'billing.pageDescription',
            'Manage your subscription, invoices, and pending dues for your GramorX account.'
          )}
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
              {t('billing.title', 'Billing')}
            </Heading>
            <p className="text-small text-muted-foreground">
              {t(
                'billing.subtitle',
                'Manage your plan, invoices, and local payment activity.'
              )}
            </p>
          </header>

          {/* Safepay alerts */}
          {showSafepaySetup && (
            <Alert
              variant="warning"
              appearance="soft"
              title={t('billing.safepay.setupTitle', 'Safepay requires configuration')}
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {t(
                  'billing.safepay.setupDesc',
                  'Safepay is running in developer mode. Add your Safepay public and secret keys to enable the live checkout experience.'
                )}
              </p>
              <p className="mt-2 text-caption text-muted-foreground">
                {t(
                  'billing.safepay.setupHint',
                  'Update SAFEPAY_PUBLIC_KEY and SAFEPAY_SECRET_KEY in your environment, then restart the app.'
                )}
              </p>
            </Alert>
          )}

          {showSafepayPending && (
            <Alert
              variant="info"
              appearance="soft"
              title={t('billing.safepay.pendingTitle', 'Safepay payment pending')}
              role="status"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {t(
                  'billing.safepay.pendingDesc',
                  'We have not received confirmation from Safepay yet. You will get an email once the payment completes.'
                )}
              </p>
            </Alert>
          )}

          {showSafepayCancelled && (
            <Alert
              variant="warning"
              appearance="soft"
              title={t('billing.safepay.cancelledTitle', 'Safepay checkout cancelled')}
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {t(
                  'billing.safepay.cancelledDesc',
                  'Your Safepay session was cancelled before payment was completed. Start a new checkout to try again.'
                )}
              </p>
            </Alert>
          )}

          {showSafepayFailed && (
            <Alert
              variant="error"
              appearance="soft"
              title={t('billing.safepay.failedTitle', 'Safepay payment failed')}
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {safepayReason
                  ? safepayReason
                  : t(
                      'billing.safepay.failedDesc',
                      'Safepay reported that the payment could not be completed. Try again or choose another method.'
                    )}
              </p>
            </Alert>
          )}

          {showSafepayError && (
            <Alert
              variant="error"
              appearance="soft"
              title={t('billing.safepay.errorTitle', 'Safepay verification error')}
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">
                {t(
                  'billing.safepay.errorDesc',
                  'We could not verify the Safepay callback. If you completed the payment, contact support with your receipt.'
                )}
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
              title={t('common.error', 'Error')}
              role="alert"
            >
              <p className="mt-2 text-small text-muted-foreground">{error}</p>
              <div className="mt-3">
                <Button asChild variant="link" size="sm">
                  <Link href="/pricing">{t('billing.goToPricing', 'Go to pricing')}</Link>
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
                    <SectionLabel>{t('billing.currentPlan', 'Current plan')}</SectionLabel>
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
                      {portalLoading
                        ? t('common.opening', 'Opening…')
                        : t('billing.manage', 'Manage billing')}
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="lg">
                      <Link href="/pricing">{t('billing.changePlan', 'Change plan')}</Link>
                    </Button>
                  )}
                </CardHeader>

                {(justVaulted || !portalAvailable) && (
                  <CardContent className="space-y-3 pt-0">
                    {!portalAvailable && (
                      <Alert
                        variant="info"
                        appearance="soft"
                        title={t('billing.portalUnavailable', 'Billing portal unavailable')}
                      >
                        <p className="mt-1 text-small text-muted-foreground">
                          {t(
                            'billing.portalUnavailableDesc',
                            'The hosted Stripe portal is temporarily offline. Email support@gramorx.com to update or cancel your subscription.'
                          )}
                        </p>
                      </Alert>
                    )}

                    {justVaulted && (
                      <Alert
                        variant="warning"
                        appearance="soft"
                        title={t('billing.cardSaved', 'Card saved — payment due later')}
                      >
                        <p className="mt-1 text-small text-muted-foreground">
                          {t(
                            'billing.cardSavedDesc',
                            'Payments are temporarily unavailable. If you recently subscribed, your card was not charged and the amount is marked as due. We’ll notify you before retrying payment.'
                          )}
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
                      <SectionLabel>{t('billing.localPayments', 'Local payments')}</SectionLabel>
                      <Heading
                        as="h2"
                        size="xs"
                        id="pending-dues"
                        className="text-foreground"
                      >
                        {t('billing.pendingDues', 'Pending dues')}
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
                        {t('billing.payWithCard', 'Pay with card')}
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
                                {toTitleCase(d.plan_key)} · {toTitleCase(d.cycle)}
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
                                {t('billing.notCharged', 'Not charged yet')}
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
                    <SectionLabel>{t('billing.history', 'History')}</SectionLabel>
                    <Heading
                      as="h2"
                      size="xs"
                      id="invoices-heading"
                      className="text-foreground"
                    >
                      {t('billing.invoices', 'Invoices')}
                    </Heading>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-small text-muted-foreground">
                      {t('billing.noInvoices', 'No invoices yet.')}
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
                              <Badge variant={getInvoiceVariant(inv.status)}>
                                {toTitleCase(inv.status)}
                              </Badge>
                              <p className="text-caption text-muted-foreground">
                                {formatDateTime(inv.createdAt)}
                              </p>
                            </div>
                            <div className="space-y-2 text-right">
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
                                    {t('billing.viewInvoice', 'View invoice')}
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-caption text-muted-foreground">
                                  {t('billing.noPDF', 'No PDF')}
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
              title={t('billing.noSubscription', 'No subscription data')}
            >
              <p className="mt-2 text-small text-muted-foreground">
                {t(
                  'billing.noSubscriptionDesc',
                  'We couldn’t find an active subscription yet. Start a plan from the pricing page when you’re ready.'
                )}
              </p>
              <div className="mt-3">
                <Button asChild variant="link" size="sm">
                  <Link href="/pricing">{t('billing.goToPricing', 'Go to pricing')}</Link>
                </Button>
              </div>
            </Alert>
          )}
        </Section>
      </main>
    </>
  );
}