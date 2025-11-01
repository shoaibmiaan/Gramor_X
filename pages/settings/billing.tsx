import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Skeleton } from '@/components/design-system/Skeleton';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

type BillingState = {
  plan?: 'free' | 'starter' | 'booster' | 'master';
  status?: 'active' | 'canceled' | 'past_due' | 'none';
  renewal?: string | null; // ISO
  paymentMethod?: 'card' | 'none';
};

const statusVariant = (status: BillingState['status']) => {
  switch (status) {
    case 'active':
      return 'success' as const;
    case 'past_due':
      return 'warning' as const;
    case 'canceled':
      return 'neutral' as const;
    case 'none':
    default:
      return 'secondary' as const;
  }
};

const formatStatus = (status: BillingState['status']) =>
  status ? status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'None';

const formatPlan = (plan: BillingState['plan']) =>
  plan ? plan.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Free';

const formatPaymentMethod = (method: BillingState['paymentMethod']) =>
  method === 'card' ? 'Card on file' : 'No payment method';

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [activated, setActivated] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    setActivated(url.searchParams.get('activated'));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) {
          setBilling({ plan: 'free', status: 'none', paymentMethod: 'none', renewal: null });
          return;
        }

        let current: BillingState = { plan: 'free', status: 'none', paymentMethod: 'none', renewal: null };

        try {
          const { data: profile } = await supabase.from('profiles').select('membership_plan').eq('id', user.id).single();
          if (profile?.membership_plan) current.plan = profile.membership_plan as BillingState['plan'];
        } catch {
          /* ignore */
        }

        try {
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('status,current_period_end,payment_method,plan')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (sub) {
            current = {
              plan: (sub.plan ?? current.plan) as BillingState['plan'],
              status: (sub.status ?? 'active') as BillingState['status'],
              renewal: sub.current_period_end ?? null,
              paymentMethod: (sub.payment_method ?? 'card') as BillingState['paymentMethod'],
            };
          }
        } catch {
          /* ignore if table absent */
        }

        setBilling(current);
      } catch {
        setBilling({ plan: 'free', status: 'none', paymentMethod: 'none', renewal: null });
      }
    })();
  }, []);

  const renewalLabel = useMemo(() => {
    if (!billing?.renewal) return null;
    try {
      return new Date(billing.renewal).toLocaleDateString();
    } catch {
      return null;
    }
  }, [billing?.renewal]);

  return (
    <main className="bg-lightBg py-16 text-foreground dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container className="max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-h2 font-semibold">Billing</h1>
          <p className="text-small text-muted-foreground">Review your plan, payment method, and next steps.</p>
        </header>

        {activated ? (
          <Alert variant="success" appearance="soft" className="border-none">
            Your membership is active. You can manage plan details below.
          </Alert>
        ) : null}

        {!billing ? (
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
                <div>
                  <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Current plan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 id="current-plan-heading" className="text-h3 font-semibold capitalize">
                      {formatPlan(billing.plan)}
                    </h2>
                    <Badge variant={statusVariant(billing.status)}>{formatStatus(billing.status)}</Badge>
                  </div>
                  {renewalLabel ? (
                    <p className="mt-2 text-small text-muted-foreground">Renews on {renewalLabel}</p>
                  ) : (
                    <p className="mt-2 text-small text-muted-foreground">No renewal scheduled</p>
                  )}
                </div>
              </div>
            </Card>

            <Card padding="lg" insetBorder as="section" aria-labelledby="payment-method-heading">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 id="payment-method-heading" className="text-h4 font-semibold">
                      Payment method
                    </h2>
                    <p className="mt-1 text-small text-muted-foreground">
                      {formatPaymentMethod(billing.paymentMethod)}
                    </p>
                  </div>
                  <Badge variant={billing.paymentMethod === 'card' ? 'info' : 'neutral'} size="sm">
                    {billing.paymentMethod === 'card' ? 'Securely stored' : 'Action needed'}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" tone="default" size="sm" disabled>
                    Update card (coming soon)
                  </Button>
                  <Button variant="soft" tone="default" size="sm" disabled>
                    Download invoices
                  </Button>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild variant="link" size="sm" className="text-small">
                <Link href="/pricing">Change plan</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
