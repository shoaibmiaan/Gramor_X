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
import { GlobalPlanGuard } from '@/components/GlobalPlanGuard';
import { useLocale } from '@/lib/locale';
import { getStandardPlanName } from '@/lib/subscription';
import type { PlanId } from '@/types/pricing';

type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due';

type SubscriptionPlanKey = 'free' | 'starter' | 'booster' | 'master';

type PortalSubscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  renewsAt?: string;
  trialEndsAt?: string;
};

type PortalResponse = {
  subscription: PortalSubscription;
  invoices: Array<unknown>;
};

type PlanDisplay = {
  name: string;
  features: string[];
  price?: string;
  priceMonthly?: number;
  currency?: string;
};

const PLAN_DISPLAY: Record<SubscriptionPlanKey, PlanDisplay> = {
  free: {
    name: getStandardPlanName('free'),
    features: ['Basic access', 'Limited mocks', 'Community support'],
    price: '$0',
  },
  starter: {
    name: getStandardPlanName('starter'),
    features: ['More mocks', 'Basic analytics', 'Email reminders'],
    price: '$5.99/month',
    priceMonthly: 599,
    currency: 'USD',
  },
  booster: {
    name: getStandardPlanName('booster'),
    features: ['Full mocks', 'Band analytics', 'AI feedback'],
    price: '$9.99/month',
    priceMonthly: 999,
    currency: 'USD',
  },
  master: {
    name: getStandardPlanName('master'),
    features: ['Everything in Booster', 'Teacher tools', 'Priority support'],
    price: '$14.99/month',
    priceMonthly: 1499,
    currency: 'USD',
  },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { error: toastError, success: toastSuccess } = useToast();

  const [subscription, setSubscription] = useState<PortalSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'full' }),
    [locale]
  );

  const formatDate = useCallback(
    (dateStr?: string | null) => {
      if (!dateStr) return null;
      try {
        return dateFormatter.format(new Date(dateStr));
      } catch {
        return dateStr;
      }
    },
    [dateFormatter]
  );

  useEffect(() => {
    let cancelled = false;

    const loadSubscription = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/subscriptions/portal', { credentials: 'include' });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load subscription');
        }
        const data = (await response.json()) as PortalResponse;
        if (cancelled) return;
        setSubscription(data.subscription);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : t('subscription.error.load', 'Unable to load subscription details.');
        setError(message);
        toastError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [router, t, toastError]);

  const currentPlan: PlanId = subscription?.plan ?? 'free';
  const planKey: SubscriptionPlanKey = (currentPlan as SubscriptionPlanKey) ?? 'free';

  const status: SubscriptionStatus = subscription?.status ?? 'canceled';

  const expiresAt = subscription?.renewsAt ?? null;
  const trialEndsAt = subscription?.trialEndsAt ?? null;

  const isPremium = currentPlan !== 'free' && (status === 'active' || status === 'trialing');
  const isTrialing = status === 'trialing' && !!trialEndsAt;

  const displayPlan = PLAN_DISPLAY[planKey] ?? PLAN_DISPLAY.free;

  const handleCancel = async () => {
    if (!confirm(t('subscription.cancel.confirm', 'Are you sure you want to cancel your subscription?'))) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('subscription.cancel.error', 'Failed to cancel subscription'));
      }

      toastSuccess(t('subscription.cancel.success', 'Subscription cancelled successfully.'));
      const refreshed = await fetch('/api/subscriptions/portal', { credentials: 'include' });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as PortalResponse;
        setSubscription(data.subscription);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('subscription.cancel.error', 'Failed to cancel subscription');
      toastError(message);
    } finally {
      setCancelling(false);
    }
  };

  const statusVariant = (): React.ComponentProps<typeof Badge>['variant'] => {
    switch (status) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info';
      case 'past_due':
      case 'incomplete':
        return 'warning';
      case 'canceled':
      default:
        return 'neutral';
    }
  };

  const statusText = () => {
    switch (status) {
      case 'active':
        return t('subscription.status.active', 'Active');
      case 'trialing':
        return t('subscription.status.trialing', 'Trial');
      case 'past_due':
        return t('subscription.status.pastDue', 'Past due');
      case 'incomplete':
        return t('subscription.status.incomplete', 'Incomplete');
      case 'canceled':
      default:
        return t('subscription.status.canceled', 'Canceled');
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>{t('subscription.pageTitle', 'Subscription · GramorX')}</title>
        </Head>
        <section className="py-12 bg-background text-foreground">
          <Container>
            <div className="mx-auto max-w-2xl space-y-6">
              <Skeleton className="h-10 w-48 rounded-ds-xl" />
              <Card className="p-6 rounded-ds-2xl">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-32 rounded-ds" />
                  <Skeleton className="h-16 w-full rounded-ds" />
                  <Skeleton className="h-10 w-40 rounded-ds" />
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
          <title>{t('subscription.pageTitle', 'Subscription · GramorX')}</title>
          <meta
            name="description"
            content={t(
              'subscription.pageDescription',
              'Manage your subscription plan, view details, and upgrade for more features.'
            )}
          />
        </Head>

        <section className="py-12 bg-background text-foreground">
          <Container>
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-h2 font-bold">
                  {t('subscription.title', 'Subscription')}
                </h1>
                <Button asChild variant="outline" size="sm">
                  <Link href="/account/billing">
                    ← {t('subscription.back', 'Back to billing')}
                  </Link>
                </Button>
              </div>

              {error && (
                <Alert variant="error" role="alert" className="rounded-ds-2xl">
                  {error}
                </Alert>
              )}

              <Card className="rounded-ds-2xl p-6">
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                      <span className="font-semibold">
                        {displayPlan.name} {t('subscription.plan', 'Plan')}
                      </span>
                    </div>

                    {isTrialing && trialEndsAt && (
                      <Alert variant="info" className="w-full">
                        {t('subscription.trial.message', 'Your trial ends on {{date}}.', {
                          date: formatDate(trialEndsAt) ?? '',
                        })}
                      </Alert>
                    )}

                    <div className="text-2xl font-bold">
                      {displayPlan.price ?? t('subscription.price.free', 'Free')}
                    </div>

                    {expiresAt && status !== 'canceled' && (
                      <p className="text-caption text-muted-foreground">
                        {t('subscription.validUntil', 'Access valid until {{date}}.', {
                          date: formatDate(expiresAt) ?? '',
                        })}
                      </p>
                    )}

                    {status === 'canceled' && expiresAt && (
                      <p className="text-caption text-muted-foreground">
                        {t('subscription.canceled.message', 'Your subscription will end on {{date}}.', {
                          date: formatDate(expiresAt) ?? '',
                        })}
                      </p>
                    )}

                    <Badge variant={statusVariant()}>{statusText()}</Badge>

                    <p className="text-small text-muted-foreground max-w-md">
                      {t(
                        'subscription.description',
                        'Manage your plan, view billing history, and upgrade for more features.'
                      )}
                    </p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h2 className="font-semibold mb-2">
                      {t('subscription.features', 'What’s included:')}
                    </h2>
                    <ul className="space-y-2 text-small">
                      {displayPlan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3">
                    {isPremium ? (
                      <>
                        <Button
                          asChild
                          variant="primary"
                          className="rounded-ds-xl"
                        >
                          <Link href="/pricing">
                            {t('subscription.changePlan', 'Change plan')}
                          </Link>
                        </Button>

                        {status === 'active' && (
                          <Button
                            variant="outline"
                            tone="danger"
                            className="rounded-ds-xl"
                            onClick={handleCancel}
                            loading={cancelling}
                            disabled={cancelling}
                          >
                            {cancelling
                              ? t('common.cancelling', 'Cancelling…')
                              : t('subscription.cancel', 'Cancel subscription')}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        asChild
                        variant="primary"
                        className="rounded-ds-xl"
                      >
                        <Link href="/pricing">
                          {t('subscription.upgrade', 'Upgrade to Premium')}
                        </Link>
                      </Button>
                    )}

                    {(subscription?.plan !== 'free' || isPremium) && (
                      <Button
                        asChild
                        variant="ghost"
                        className="rounded-ds-xl"
                      >
                        <Link href="/account/billing-history">
                          {t('subscription.viewBilling', 'View billing history')}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

              {/* Help section */}
              <Card className="rounded-ds-2xl p-4 bg-muted/30">
                <p className="text-small text-muted-foreground">
                  {t(
                    'subscription.help',
                    'Need help with your subscription? Contact our support team at {{email}}',
                    { email: 'support@gramorx.com' }
                  )}
                </p>
              </Card>
            </div>
          </Container>
        </section>
      </>
    </GlobalPlanGuard>
  );
}