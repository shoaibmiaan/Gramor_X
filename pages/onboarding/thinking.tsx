import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { AIRoadmapLoadingScreen } from '@/components/onboarding/AIRoadmapLoadingScreen';
import { onboardingPayloadSchema, type OnboardingPayload } from '@/lib/onboarding/aiStudyPlan';

const ONBOARDING_STORAGE_KEY = 'gramorx:onboarding-input';
const MIN_LOADING_MS = 5000;

function parseOnboardingInput(raw: string | null): OnboardingPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = onboardingPayloadSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export default function ThinkingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const input = parseOnboardingInput(sessionStorage.getItem(ONBOARDING_STORAGE_KEY));

    if (!input) {
      sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
      void router.replace('/onboarding');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch('/api/ai/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          throw new Error('Failed to generate plan. Please try again.');
        }

        const elapsed = Date.now() - startedAtRef.current;
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        await new Promise((resolve) => window.setTimeout(resolve, remaining));

        if (cancelled) {
          return;
        }

        sessionStorage.removeItem(ONBOARDING_STORAGE_KEY);
        void router.replace('/dashboard');
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to generate plan. Please try again.',
          );
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AIRoadmapLoadingScreen
      error={error}
      onRetry={() => {
        window.location.reload();
      }}
    />
  );
}
