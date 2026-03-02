import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchProfile } from '@/lib/profile';
import {
  PLAN_DISPLAY,
  formatDateLabel,
  hasActiveSubscription,
  isTrialActive,
  normalizePlan,
  normalizeStatus,
} from '@/lib/subscription';
import type { Profile } from '@/types/profile';

export function useSubscription() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedProfile = await fetchProfile();
      if (!fetchedProfile) throw new Error('Profile not found');
      setProfile(fetchedProfile);
      return fetchedProfile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load subscription details.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch((err) => {
      if (err instanceof Error && err.message === 'Not authenticated') return;
    });
  }, [load]);

  const plan = useMemo(() => normalizePlan(profile?.tier), [profile?.tier]);
  const status = useMemo(() => normalizeStatus(profile?.subscription_status), [profile?.subscription_status]);
  const expiresAt = profile?.subscription_expires_at ?? profile?.premium_until ?? null;

  return {
    profile,
    plan,
    status,
    displayPlan: PLAN_DISPLAY[plan],
    expiresAt,
    expiresAtLabel: formatDateLabel(expiresAt),
    isPremium: hasActiveSubscription(plan, status),
    isTrial: isTrialActive(profile?.premium_until),
    hasBillingHistory: Boolean(profile?.stripe_customer_id) && status === 'active',
    loading,
    error,
    refresh: load,
  };
}

export default useSubscription;
