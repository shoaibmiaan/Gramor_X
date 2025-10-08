import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { SubscriptionTier } from '@/lib/navigation/types';
import type { PlanId } from '@/types/pricing';

type WaitOptions = {
  attempts?: number;
  intervalMs?: number;
};

type UpgradeResult = {
  tier: SubscriptionTier;
  role: string | null;
  planId: PlanId;
};

const tierToPlan: Record<SubscriptionTier, PlanId> = {
  free: 'free',
  seedling: 'starter',
  rocket: 'booster',
  owl: 'master',
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncSessionCookie(session?: {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
  expires_at?: number | null;
}) {
  if (!session) return;

  try {
    await fetch('/api/auth/set-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        event: 'TOKEN_REFRESHED',
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token ?? undefined,
          expires_in: session.expires_in ?? undefined,
          expires_at: session.expires_at ?? undefined,
        },
      }),
    });
  } catch (error) {
    console.warn('Failed to sync session cookie after refresh:', error);
  }
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
      const { data, error } = await supabase
        .from('profiles')
        .select('tier, role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load profile while checking upgrade status:', error);
        continue;
      }

      const tier = (data?.tier as SubscriptionTier | undefined) ?? 'free';
      const role = typeof data?.role === 'string' ? data.role : null;

      if (tier !== 'free') {
        const planId = tierToPlan[tier];
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

