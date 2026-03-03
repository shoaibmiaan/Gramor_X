import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import SettingsLayout from '@/components/settings/SettingsLayout';
import { Skeleton } from '@/components/design-system/Skeleton';
import { withPageAuth } from '@/lib/requirePageAuth';
import {
  formatSubscriptionLabel,
  getSubscriptionStatusVariant,
  normalizePlan,
  normalizeStatus,
} from '@/lib/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { UsageMeter } from '@/components/billing/UsageMeter';

type Invoice = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: String(currency || 'USD').toUpperCase() }).format(
    (amount || 0) / 100,
  );

export default function BillingPage() {
  const subscription = useSubscription();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingInvoices(true);
        const res = await fetch('/api/billing/invoices', { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load invoices');
        setInvoices((json?.invoices ?? []) as Invoice[]);
      } catch (error) {
        setInvoiceError((error as Error).message || 'Failed to load invoices');
      } finally {
        setLoadingInvoices(false);
      }
    })();
  }, []);

  const renewalLabel = useMemo(() => {
    if (!subscription.renewsAt) return null;
    try {
      return new Date(subscription.renewsAt).toLocaleDateString();
    } catch {
      return null;
    }
  }, [subscription.renewsAt]);

  return (
    <SettingsLayout
      activeTab="billing"
      title="Billing"
      description="Plan transparency, usage visibility, and invoice history in one place."
    >
      {subscription.error ? (
        <Alert variant="error" appearance="soft" className="border-none">
          {subscription.error}
        </Alert>
      ) : null}

      {subscription.loading ? (
        <Card padding="lg" insetBorder>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32 rounded-ds-xl" />
            <Skeleton className="h-10 w-2/3 rounded-ds-xl" />
            <Skeleton className="h-10 w-1/2 rounded-ds-xl" />
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card padding="lg" insetBorder as="section" aria-labelledby="current-plan-heading">
            <div className="space-y-3">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Current plan</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 id="current-plan-heading" className="text-h3 font-semibold capitalize">
                  {formatSubscriptionLabel(normalizePlan(subscription.plan))}
                </h2>
                <Badge variant={getSubscriptionStatusVariant(normalizeStatus(subscription.status))}>
                  {formatSubscriptionLabel(subscription.status)}
                </Badge>
              </div>
              <p className="mt-2 text-small text-muted-foreground">
                {renewalLabel ? `Renews on ${renewalLabel}` : 'No renewal scheduled'}
              </p>
              <Button asChild size="sm" variant="soft">
                <Link href="/profile/account/billing">Manage in Stripe portal</Link>
              </Button>
            </div>
          </Card>

          <Card padding="lg" insetBorder as="section" aria-labelledby="usage-heading">
            <h2 id="usage-heading" className="text-h4 font-semibold">Usage meters</h2>
            <div className="mt-3 space-y-3">
              <UsageMeter feature="ai.explain" label="AI Explain" />
              <UsageMeter feature="ai.summary" label="AI Summary" />
              <UsageMeter feature="ai.writing.score" label="AI Writing Score" />
            </div>
          </Card>

          <Card padding="lg" insetBorder as="section" aria-labelledby="invoices-heading">
            <h2 id="invoices-heading" className="text-h4 font-semibold">Invoice history</h2>
            {loadingInvoices ? (
              <p className="mt-2 text-small text-muted-foreground">Loading invoices…</p>
            ) : invoiceError ? (
              <p className="mt-2 text-small text-danger">{invoiceError}</p>
            ) : invoices.length === 0 ? (
              <p className="mt-2 text-small text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-muted-foreground">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-border/40">
                        <td className="py-2 pr-4">{new Date(inv.date).toLocaleDateString()}</td>
                        <td className="py-2 pr-4">{money(inv.amount, inv.currency)}</td>
                        <td className="py-2 pr-4 capitalize">{String(inv.status || 'unknown').replace('_', ' ')}</td>
                        <td className="py-2">
                          <a
                            href={inv.invoice_pdf || inv.hosted_invoice_url || '#'}
                            className="text-indigo-600 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download invoice
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </SettingsLayout>
  );
}

export const getServerSideProps: GetServerSideProps = withPageAuth();
