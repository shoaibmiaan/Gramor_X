'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { useToast } from '@/components/design-system/Toaster';
import { fetchProfile } from '@/lib/profile';
import type { Profile } from '@/types/profile';
import { GlobalPlanGuard } from '@/components/GlobalPlanGuard';
import { useLocale } from '@/lib/locale';
import type { PlanId } from '@/types/pricing';

type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'past_due'
  | 'unpaid'
  | 'paused'
  | 'inactive'
  | 'expired';

type SubscriptionPlanKey = 'free' | 'starter' | 'booster' | 'master';

type PlanDisplay = {
  name: string;
  features: string[];
  price?: string;
};

const PLAN_DISPLAY: Record<SubscriptionPlanKey, PlanDisplay> = {
  free: {
    name: 'Free',
    features: ['Basic access', 'Limited mocks', 'Community support'],
    price: '$0',
  },
  starter: {
    name: 'Starter',
    features: ['More mocks', 'Basic analytics', 'Email reminders'],
    price: '$5.99/month',
  },
  booster: {
    name: 'Booster',
    features: ['Full mocks', 'Band analytics', 'AI feedback'],
    price: '$9.99/month',
  },
  master: {
    name: 'Master',
    features: ['Everything in Booster', 'Teacher tools', 'Priority support'],
    price: '$14.99/month',
  },
};

export default function SubscriptionPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { error: toastError } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
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
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'Not authenticated') {
          await router.replace('/login');
          return;
        }
        console.error('Failed to load subscription info', err);
        const message = t(
          'subscription.load.error',
          'Unable to load subscription details.',
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
  const planKey: SubscriptionPlanKey =
    (currentPlan as SubscriptionPlanKey) ?? 'free';

  const status: SubscriptionStatus =
    (profile?.subscription_status as SubscriptionStatus) ?? 'inactive';

  const expiresAt =
    profile?.subscription_expires_at ?? profile?.premium_until ?? null;
  const expiresAtLabel =
    expiresAt && !Number.isNaN(new Date(expiresAt).getTime())
      ? new Date(expiresAt).toLocaleDateString()
      : null;

  const isPremium = currentPlan !== 'free' && status === 'active';
  const isTrial =
    !!profile?.premium_until &&
    new Date(profile.premium_until) > new Date();

  const displayPlan = PLAN_DISPLAY[planKey];

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
    <GlobalPlanGuard min="free" userPlan={currentPlan}>
      <section className="py-24 bg-background text-foreground">
        <Container>
          <div className="mx-auto max-w-2xl space-y-6">
            {error && (
              <Alert variant="error" role="alert" className="rounded-ds-2xl">
                {error}
              </Alert>
            )}
            <Card className="rounded-ds-2xl p-6">
              <div className="mb-6 flex items-center justify-between">
                <h1 className="font-slab text-display">
                  {t('subscription.title', 'Subscription')}
                </h1>
              </div>
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="rounded-full bg-primary/10 px-4 py-2 text-primary">
                    <span className="font-semibold">
                      {displayPlan.name} Plan
                    </span>
                  </div>
                  {isTrial && (
                    <Alert variant="warning" className="w-full">
                      {t('subscription.trial', 'Your premium trial ends on {{date}}.', {
                        date: new Date(profile!.premium_until!).toLocaleDateString(),
                      })}
                    </Alert>
                  )}
                  <div className="text-2xl font-bold">
                    {displayPlan.price ?? t('subscription.price.free', 'Free')}
                  </div>
                  {expiresAtLabel && (
                    <p className="text-caption text-muted-foreground">
                      {t(
                        'subscription.expires',
                        'Access valid until {{date}}.',
                        { date: expiresAtLabel },
                      )}
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
                  {isPremium ? (
                    <Button
                      variant="outline"
                      className="rounded-ds-xl"
                      onClick={() => router.push('/pricing/overview')}
                    >
                      {t('subscription.manage', 'Manage subscription')}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="rounded-ds-xl"
                      onClick={() => router.push('/pricing/overview')}
                    >
                      {t('subscription.upgrade', 'Upgrade to Premium')}
                    </Button>
                  )}

                  {profile?.stripe_customer_id && status === 'active' && (
                    <Button
                      variant="ghost"
                      className="rounded-ds-xl"
                      onClick={() => router.push('/profile/profile/account/billing')}
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
