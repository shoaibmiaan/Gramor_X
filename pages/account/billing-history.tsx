'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Skeleton } from '@/components/design-system/Skeleton';
import { useToast } from '@/components/design-system/Toaster';
import { useLocale } from '@/lib/locale';
import { fetchProfile } from '@/lib/profile';
import type { Profile } from '@/types/profile';
import { GlobalPlanGuard } from '@/components/GlobalPlanGuard';
import type { PlanId } from '@/types/pricing';

type Invoice = {
  id: string;
  date: string; // ISO date
  description: string;
  amount: number; // in cents
  status: 'paid' | 'open' | 'void' | 'uncollectible' | 'draft';
  pdfUrl?: string;
  subscriptionId?: string;
};

type InvoicesResponse = {
  invoices: Invoice[];
  hasMore: boolean;
  error?: string;
};

export default function BillingHistoryPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { error: toastError } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    [locale]
  );

  const currencyFormatter = useCallback(
    (amount: number, currency: string = 'USD') =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount / 100),
    [locale]
  );

  const formatDate = useCallback(
    (dateStr: string) => dateFormatter.format(new Date(dateStr)),
    [dateFormatter]
  );

  // Fetch profile and billing history
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // First get profile to ensure authenticated and get customer info
        const fetchedProfile = await fetchProfile();
        if (cancelled) return;
        if (!fetchedProfile) {
          throw new Error('Profile not found');
        }
        setProfile(fetchedProfile);

        // Fetch billing history via API route
        const response = await fetch('/api/billing/history', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || t('billingHistory.error.fetch', 'Failed to fetch billing history'));
        }

        const data: InvoicesResponse = await response.json();
        if (cancelled) return;

        setInvoices(data.invoices || []);
        setHasMore(data.hasMore || false);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }

        const message = err instanceof Error
          ? err.message
          : t('billingHistory.error.load', 'Unable to load billing history.');
        setError(message);
        toastError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t, toastError]);

  const currentPlan: PlanId = profile?.tier ?? 'free';
  const hasSubscription = !!profile?.stripe_customer_id && profile.subscription_status === 'active';

  // Status badge variant
  const getStatusVariant = (status: Invoice['status']): React.ComponentProps<typeof Badge>['variant'] => {
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

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('billingHistory.pageTitle', 'Billing History · GramorX')}</title>
        </Head>
        <section className="py-12 bg-background text-foreground">
          <Container>
            <div className="mx-auto max-w-4xl space-y-6">
              <Skeleton className="h-10 w-64 rounded-ds-xl" />
              <Card className="p-6 rounded-ds-2xl">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full rounded-ds" />
                  <Skeleton className="h-16 w-full rounded-ds" />
                  <Skeleton className="h-16 w-full rounded-ds" />
                  <Skeleton className="h-16 w-full rounded-ds" />
                </div>
              </Card>
            </div>
          </Container>
        </section>
      </>
    );
  }

  return (
    <GlobalPlanGuard min="free" userPlan={currentPlan}>
      <>
        <Head>
          <title>{t('billingHistory.pageTitle', 'Billing History · GramorX')}</title>
          <meta
            name="description"
            content={t(
              'billingHistory.pageDescription',
              'View your past invoices and billing activity for your GramorX account.'
            )}
          />
        </Head>

        <section className="py-12 bg-background text-foreground">
          <Container>
            <div className="mx-auto max-w-4xl space-y-6">
              {/* Header with back link */}
              <div className="flex items-center justify-between">
                <h1 className="text-h2 font-bold">
                  {t('billingHistory.title', 'Billing History')}
                </h1>
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/billing">
                    ← {t('billingHistory.back', 'Back to billing')}
                  </Link>
                </Button>
              </div>

              {error && (
                <Alert variant="error" role="alert" className="rounded-ds-2xl">
                  {error}
                </Alert>
              )}

              {!hasSubscription && (
                <Alert variant="info" className="rounded-ds-2xl">
                  {t(
                    'billingHistory.noSubscription',
                    'No active subscription found. Invoices will appear once you subscribe.'
                  )}
                </Alert>
              )}

              <Card className="rounded-ds-2xl p-6">
                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {t('billingHistory.empty', 'No invoices yet.')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-small">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left font-medium text-muted-foreground">
                            {t('billingHistory.table.date', 'Date')}
                          </th>
                          <th className="py-3 text-left font-medium text-muted-foreground">
                            {t('billingHistory.table.description', 'Description')}
                          </th>
                          <th className="py-3 text-right font-medium text-muted-foreground">
                            {t('billingHistory.table.amount', 'Amount')}
                          </th>
                          <th className="py-3 text-left font-medium text-muted-foreground">
                            {t('billingHistory.table.status', 'Status')}
                          </th>
                          <th className="py-3 text-left font-medium text-muted-foreground">
                            {t('billingHistory.table.actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3">
                              {formatDate(invoice.date)}
                            </td>
                            <td className="py-3 max-w-xs truncate">
                              {invoice.description}
                            </td>
                            <td className="py-3 text-right font-mono">
                              {currencyFormatter(invoice.amount)}
                            </td>
                            <td className="py-3">
                              <Badge variant={getStatusVariant(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              {invoice.pdfUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-auto px-2 py-1"
                                >
                                  <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {t('billingHistory.download', 'PDF')}
                                  </a>
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  {t('billingHistory.unavailable', '—')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {hasMore && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" size="sm" disabled>
                      {t('billingHistory.loadMore', 'Load more')} ({t('common.comingSoon', 'coming soon')})
                    </Button>
                  </div>
                )}
              </Card>

              {/* Support footer */}
              <p className="text-center text-caption text-muted-foreground">
                {t(
                  'billingHistory.support',
                  'Questions about your invoices? Contact {{supportEmail}}',
                  { supportEmail: 'support@gramorx.com' }
                )}
              </p>
            </div>
          </Container>
        </section>
      </>
    </GlobalPlanGuard>
  );
}