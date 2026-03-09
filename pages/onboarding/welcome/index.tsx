import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function WelcomeOnboardingPage() {
  const router = useRouter();
  const nav = resolveNavigation('welcome');

  return (
    <main className="min-h-screen bg-background">
      <Container className="py-10">
        <h1 className="text-3xl font-semibold">Welcome to GramorX onboarding</h1>
        <p className="mt-2 text-muted-foreground">Step {nav.index + 1} of {nav.total}</p>
        <p className="mt-6">We will ask a few questions to personalize your IELTS plan.</p>
        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={() => router.push('/dashboard')}>Skip for now</Button>
          <Button onClick={async () => { await saveOnboardingStep(1, {}); if (nav.next) await router.push(nav.next.path); }}>Start</Button>
        </div>
      </Container>
    </main>
  );
}
