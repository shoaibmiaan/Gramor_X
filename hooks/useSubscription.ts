import { useCallback, useEffect, useState } from 'react';
import {
  PLAN_DISPLAY,
  formatDateLabel,
  formatSubscriptionLabel,
  getFeatureAccess as getFeatureAccessForUser,
  hasActiveSubscription,
  normalizePlan,
  normalizeStatus,
} from '@/lib/subscription';
import type { SubscriptionApiResponse, SubscriptionSummary } from '@/types/subscription';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type SubscriptionState = {
  plan: ReturnType<typeof normalizePlan>;
  status: ReturnType<typeof normalizeStatus>;
  renewsAt: string | null;
  trialEndsAt: string | null;
};

export function useSubscription() {
  const [summary, setSummary] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/portal', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      const json = (await response.json()) as SubscriptionApiResponse;
      if (!response.ok || 'ok' in json) {
        throw new Error('Unable to load subscription details.');
      }

      const subscription = (json.subscription ?? { plan: 'free', status: 'inactive' }) as SubscriptionSummary;
      const next: SubscriptionState = {
        plan: normalizePlan(subscription.plan),
        status: normalizeStatus(subscription.status),
        renewsAt: subscription.renewsAt ?? null,
        trialEndsAt: subscription.trialEndsAt ?? null,
      };

      setSummary(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load subscription details.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const plan = summary?.plan ?? 'free';
  const status = summary?.status ?? 'inactive';
  const renewsAt = summary?.renewsAt ?? null;

  return {
    plan,
    status,
    displayPlan: PLAN_DISPLAY[plan],
    statusLabel: formatSubscriptionLabel(status),
    renewsAt,
    renewsAtLabel: formatDateLabel(renewsAt),
    expiresAt: renewsAt,
    expiresAtLabel: formatDateLabel(renewsAt),
    trialEndsAt: summary?.trialEndsAt ?? null,
    trialEndsAtLabel: formatDateLabel(summary?.trialEndsAt ?? null),
    isPremium: hasActiveSubscription(plan, status),
    hasBillingHistory: plan !== 'free' && status === 'active',
    loading,
    error,
    refresh: load,
  };
}

export function useIsActive() {
  const subscription = useSubscription();
  return {
    ...subscription,
    isActive: subscription.isPremium,
  };
}

export function useFeatureAccess(feature: string) {
  const { plan, loading, error } = useSubscription();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (loading || error) return;
      try {
        const supabase = supabaseBrowser;
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) {
          if (!cancelled) setAllowed(plan !== 'free');
          return;
        }
        const access = await getFeatureAccessForUser(supabase, userId, feature);
        if (!cancelled) setAllowed(access);
      } catch {
        if (!cancelled) setAllowed(plan !== 'free');
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [plan, feature, loading, error]);

  return { allowed, loading, error };
}

export default useSubscription;
