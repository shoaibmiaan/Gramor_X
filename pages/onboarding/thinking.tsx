import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { onboardingPayloadSchema, type OnboardingPayload } from '@/lib/onboarding/aiStudyPlan';

const THINKING_LINES = [
  'Analyzing your target score…',
  'Calculating optimal study hours…',
  'Structuring writing improvement path…',
];

export default function ThinkingPage() {
  const router = useRouter();
  const [lineIndex, setLineIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const activeLine = useMemo(() => THINKING_LINES[lineIndex % THINKING_LINES.length], [lineIndex]);

  useEffect(() => {
    const raw = sessionStorage.getItem('gramorx:onboarding-input');
    if (!raw) {
      void router.replace('/onboarding');
      return;
    }

    const parse = onboardingPayloadSchema.safeParse(JSON.parse(raw) as OnboardingPayload);
    if (!parse.success) {
      sessionStorage.removeItem('gramorx:onboarding-input');
      void router.replace('/onboarding');
      return;
    }

    const interval = window.setInterval(() => setLineIndex((prev) => prev + 1), 1500);
    const startedAt = Date.now();

    const run = async () => {
      try {
        const response = await fetch('/api/ai/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parse.data),
        });

        if (!response.ok) {
          throw new Error('Failed to generate plan.');
        }

        const elapsed = Date.now() - startedAt;
        const minDelay = Math.max(0, 5000 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, minDelay));
        sessionStorage.removeItem('gramorx:onboarding-input');
        void router.replace('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate plan.');
      }
    };

    void run();
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="w-full rounded-2xl border bg-white p-10 shadow-sm">
        <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <h1 className="text-2xl font-bold">Generating your AI study plan</h1>
        <p className="mt-4 text-lg text-gray-700">{activeLine}</p>
        <p className="mt-3 text-sm text-gray-500">Please keep this tab open while we personalize your roadmap.</p>

        {error && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            <p>{error}</p>
            <button
              type="button"
              className="mt-3 rounded-md bg-red-600 px-3 py-2 text-sm text-white"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
