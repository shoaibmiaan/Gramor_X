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
      <section className="py-24 bg-background text-foreground">
        <Container>
          <Card className="mx-auto max-w-xl rounded-ds-2xl p-6">
            {t('subscription.loading', 'Loading subscription…')}
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <GlobalPlanGuard min="free" userPlan={plan}>
      <section className="py-24 bg-background text-foreground">
        <Container>
          <div className="mx-auto max-w-2xl space-y-6">
            {error && error !== 'Not authenticated' && (
              <Alert variant="error" role="alert" className="rounded-ds-2xl">
                {t('subscription.load.error', 'Unable to load subscription details.')}
              </Alert>
            )}
            <Card className="rounded-ds-2xl p-4 sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="font-slab text-display">{t('subscription.title', 'Subscription')}</h1>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                    <span className="font-semibold">{displayPlan.name} Plan</span>
                  </div>
                  {isTrial && (
                    <Alert variant="warning" className="w-full">
                      {t('subscription.trial', 'Your premium trial ends on {{date}}.', {
                        date: currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : '',
                      })}
                    </Alert>
                  )}
                  <div className="text-2xl font-bold">
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

                <ul className="space-y-2 text-small">
                  {displayPlan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-3">
                  <Button
                    variant={isPremium ? 'outline' : 'primary'}
                    className="rounded-ds-xl"
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
