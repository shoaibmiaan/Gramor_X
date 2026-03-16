import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetchOnboardingState } from '@/lib/onboarding/client';

type UseOnboardingGuardOptions = {
  enabled?: boolean;
  redirectTo?: string;
};

export function useOnboardingGuard({
  enabled = true,
  redirectTo = '/dashboard',
}: UseOnboardingGuardOptions = {}) {
  const router = useRouter();
  const [checking, setChecking] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setChecking(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const state = await fetchOnboardingState();
        if (!active) return;

        if (state.onboardingComplete) {
          await router.replace(redirectTo);
          return;
        }
      } catch {
        // no-op; middleware is the primary guard.
      } finally {
        if (active) setChecking(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled, redirectTo, router]);

  return { checking };
}
