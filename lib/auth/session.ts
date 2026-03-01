import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { SubscriptionTier } from '@/lib/navigation/types';
import type { PlanId } from '@/types/pricing';
import { getProfileRole } from '@/lib/repositories/profileRepository';
import { getUserTier, tierToPlan } from '@/lib/repositories/subscriptionRepository';

type WaitOptions = {
  attempts?: number;
  intervalMs?: number;
};

type UpgradeResult = {
  tier: SubscriptionTier;
  role: string | null;
  planId: PlanId;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncSessionCookie() {
  // server session cookie sync removed; auth cookies are server-owned.
}

export async function waitForSubscriptionUpgrade({
  attempts = 4,
  intervalMs = 2000,
}: WaitOptions = {}): Promise<UpgradeResult | null> {
  if (typeof window === 'undefined') return null;

  const supabase = supabaseBrowser;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) {
    console.warn('Cannot refresh subscription tier without an authenticated user.');
    return null;
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await delay(intervalMs);

    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        await syncSessionCookie(data.session);
      }
    } catch (error) {
      console.warn('Supabase refreshSession failed while checking upgrade status:', error);
    }

    try {
      const [{ tier }, roleRes] = await Promise.all([
        getUserTier(supabase as any, userId),
        getProfileRole(supabase as any, userId),
      ]);

      if (roleRes.error) {
        console.warn('Failed to load profile role while checking upgrade status:', roleRes.error);
        continue;
      }

      const role = typeof roleRes.data?.role === 'string' ? roleRes.data.role : null;

      if (tier !== 'free') {
        const planId = tierToPlan(tier);
        const detail: UpgradeResult = { tier, role, planId };
        window.dispatchEvent(new CustomEvent('subscription:tier-updated', { detail }));
        return detail;
      }
    } catch (error) {
      console.warn('Error while polling for subscription upgrade:', error);
    }
  }

  return null;
}

