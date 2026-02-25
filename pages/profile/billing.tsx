'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { useToast } from '@/components/design-system/Toaster';
import { fetchProfile } from '@/lib/profile';
import type { Profile } from '@/types/profile';
import { GlobalPlanGuard } from '@/components/GlobalPlanGuard';
import { useLocale } from '@/lib/locale';
import type { PlanId } from '@/types/pricing';

type Invoice = {
  id: string;
  date: string; // ISO date
  description: string;
  amount: number; // in cents
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  pdfUrl?: string;
  subscriptionId?: string;
};

export default function BillingHistoryPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const fetchedProfile = await fetchProfile();
        if (cancelled) return;
        if (!fetchedProfile) {
          throw new Error('Profile not found');
        }
        setProfile(fetchedProfile);

        // Fetch billing history via API route (server-side Stripe call)
        const response = await fetch('/api/billing/history', {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch billing history');
        }
        const data = await response.json();
        setInvoices(data.invoices || []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }
        console.error('Failed to load billing history', err);
        const message = t(
          'billing.load.error',
          'Unable to load billing history.',
        );
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
  const hasSubscription =
    !!profile?.stripe_customer_id &&
    profile.subscription_status === 'active';

  if (loading) {
    return (
      <>
        <Head>
          <title>Billing History · GramorX</title>
        </Head>
        <main className="py-24 bg-background text-foreground">
          <Container>
            <Card className="mx-auto max-w-xl rounded-ds-2xl p-6">
              {t('billing.loading', 'Loading billing history…')}
            </Card>
          </Container>
        </main>
      </>
    );
  }

  const formatAmount = (amount: number) => `$${(amount / 100).toFixed(2)}`;
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <GlobalPlanGuard min="free" userPlan={currentPlan}>
      <>
        <Head>
          <title>Billing History · GramorX</title>
          <meta
            name="description"
            content="View your past invoices and billing activity for your GramorX account."
          />
        </Head>

        <main className="py-24 bg-background text-foreground">
          <Container>
            <div className="mx-auto max-w-4xl space-y-6">
              {error && (
                <Alert variant="error" role="alert" className="rounded-ds-2xl">
                  {error}
                </Alert>
              )}

              {!hasSubscription && (
                <Alert variant="info" className="rounded-ds-2xl">
                  {t(
                    'billing.noHistory',
                    'No billing history yet. Upgrade to see invoices.',
                  )}
                </Alert>
              )}

              <Card className="rounded-ds-2xl p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h1 className="font-slab text-display">
                    {t('billing.title', 'Billing History')}
                  </h1>
                  {hasSubscription && (
                    <Button
                      variant="outline"
                      className="rounded-ds-xl"
                      onClick={() => router.push('/profile/profile/account/billing')}
                    >
                      {t(
                        'billing.portal',
                        'Open billing & subscription hub',
                      )}
                    </Button>
                  )}
                </div>

                {invoices.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {t('billing.empty', 'No invoices yet.')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-small">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-3 text-left">
                            {t('billing.table.date', 'Date')}
                          </th>
                          <th className="py-3 text-left">
                            {t('billing.table.desc', 'Description')}
                          </th>
                          <th className="py-3 text-right">
                            {t('billing.table.amount', 'Amount')}
                          </th>
                          <th className="py-3 text-left">
                            {t('billing.table.status', 'Status')}
                          </th>
                          <th className="py-3 text-left">
                            {t('billing.table.actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="border-b border-border last:border-b-0"
                          >
                            <td className="py-3">
                              {formatDate(invoice.date)}
                            </td>
                            <td className="py-3">{invoice.description}</td>
                            <td className="py-3 text-right">
                              {formatAmount(invoice.amount)}
                            </td>
                            <td className="py-3">
                              <Badge
                                variant={
                                  invoice.status === 'paid'
                                    ? 'success'
                                    : 'secondary'
                                }
                              >
                                {invoice.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              {invoice.pdfUrl ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  as="a"
                                  href={invoice.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-auto px-2 py-1"
                                >
                                  {t('billing.download', 'PDF')}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </Container>
        </main>
      </>
    </GlobalPlanGuard>
  );
}
