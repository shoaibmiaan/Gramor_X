'use client';

import React from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { useToast } from '@/components/design-system/Toaster';
import { GlobalPlanGuard } from '@/components/GlobalPlanGuard';
import { useLocale } from '@/lib/locale';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const {
    plan,
    status,
    displayPlan,
    currentPeriodEnd,
    expiresAtLabel,
    isPremium,
    isTrial,
    hasBillingHistory,
    loading,
    error,
  } = useSubscription();

  React.useEffect(() => {
    if (!error || error === 'Not authenticated') return;
    const message = t('subscription.load.error', 'Unable to load subscription details.');
    toastError(message);
  }, [error, t, toastError]);

  React.useEffect(() => {
    if (error === 'Not authenticated') {
      void router.replace('/login');
    }
  }, [error, router]);

  if (loading) {
    return (
      <section className="bg-background py-24 text-foreground">
        <Container>
          <Card className="mx-auto max-w-2xl rounded-ds-2xl p-6 sm:p-8">
            <div className="space-y-4">
              <div className="h-7 w-44 animate-pulse rounded bg-muted" />
              <div className="h-10 w-36 animate-pulse rounded-full bg-muted" />
              <div className="h-16 animate-pulse rounded-ds-xl bg-muted" />
              <p className="text-small text-muted-foreground">
                {t('subscription.loading', 'Loading subscription…')}
              </p>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <GlobalPlanGuard min="free" userPlan={plan}>
      <section className="bg-background py-24 text-foreground">
        <Container>
          <div className="mx-auto max-w-2xl space-y-6">
            {error && error !== 'Not authenticated' && (
              <Alert variant="error" role="alert" className="rounded-ds-2xl">
                {t('subscription.load.error', 'Unable to load subscription details.')}
              </Alert>
            )}
            <Card className="rounded-ds-2xl border border-border/80 p-4 shadow-sm sm:p-6">
              <div className="mb-6 flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-slab text-display">{t('subscription.title', 'Subscription')}</h1>
                <span className="inline-flex w-fit items-center rounded-full bg-secondary px-3 py-1 text-caption font-semibold text-secondary-foreground">
                  {status === 'active'
                    ? t('subscription.status.active', 'Active')
                    : t('subscription.status.inactive', 'Inactive')}
                </span>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 rounded-ds-xl bg-muted/40 p-5 text-center sm:p-6">
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-primary ring-1 ring-primary/20">
                    <span className="font-semibold">{displayPlan.name} Plan</span>
                  </div>
                  {isTrial && (
                    <Alert variant="warning" className="w-full">
                      {t('subscription.trial', 'Your premium trial ends on {{date}}.', {
                        date: currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : '',
                      })}
                    </Alert>
                  )}
                  <div className="text-3xl font-bold tracking-tight">
                    {displayPlan.price ?? t('subscription.price.free', 'Free')}
                  </div>
                  {expiresAtLabel && (
                    <p className="text-caption text-muted-foreground">
                      {t('subscription.expires', 'Access valid until {{date}}.', {
                        date: expiresAtLabel,
                      })}
                    </p>
                  )}
                  <p className="text-small text-muted-foreground max-w-md">
                    {t(
                      'subscription.subtitle',
                      'Manage your plan, view billing, and upgrade for more features.',
                    )}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-ds-xl border border-border/80 bg-background p-3">
                    <p className="text-caption text-muted-foreground">
                      {t('subscription.currentPlan', 'Current plan')}
                    </p>
                    <p className="text-small font-semibold">{displayPlan.name}</p>
                  </div>
                  <div className="rounded-ds-xl border border-border/80 bg-background p-3">
                    <p className="text-caption text-muted-foreground">
                      {t('subscription.accountStatus', 'Account status')}
                    </p>
                    <p className="text-small font-semibold">
                      {status === 'active'
                        ? t('subscription.status.active', 'Active')
                        : t('subscription.status.inactive', 'Inactive')}
                    </p>
                  </div>
                </div>

                <ul className="grid gap-2 rounded-ds-xl border border-border/80 bg-background p-4 text-small sm:grid-cols-2">
                  {displayPlan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3 border-t border-border/80 pt-2">
                  <Button
                    variant={isPremium ? 'outline' : 'primary'}
                    className="rounded-ds-xl sm:w-fit"
                    onClick={() => router.push('/pricing/overview')}
                  >
                    {isPremium
                      ? t('subscription.manage', 'Manage subscription')
                      : t('subscription.upgrade', 'Upgrade to Premium')}
                  </Button>

                  {hasBillingHistory && status === 'active' && (
                    <Button
                      variant="ghost"
                      className="rounded-ds-xl"
                      onClick={() => router.push('/profile/account/billing')}
                    >
                      {t('subscription.billing', 'View billing history')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </GlobalPlanGuard>
  );
}
