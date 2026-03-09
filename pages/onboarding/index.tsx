import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function OnboardingLanguagePage() {
  const router = useRouter();
  const nav = resolveNavigation('language');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'ur'>('en');

  return (
    <main className="min-h-screen bg-background">
      <Container className="py-10">
        <h1 className="text-2xl font-semibold">Pick your language</h1>
        <p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p>
        <div className="mt-4 flex gap-3">
          <Button variant={preferredLanguage === 'en' ? 'default' : 'secondary'} onClick={() => setPreferredLanguage('en')}>English</Button>
          <Button variant={preferredLanguage === 'ur' ? 'default' : 'secondary'} onClick={() => setPreferredLanguage('ur')}>اردو</Button>
        </div>
        <div className="mt-8 flex gap-3">
          <Button variant="ghost" onClick={() => nav.prev && router.push(nav.prev.path)}>Back</Button>
          <Button onClick={async () => { await saveOnboardingStep(2, { preferredLanguage }); if (nav.next) await router.push(nav.next.path); }}>Continue</Button>
        </div>
      </Container>
    </main>
  );
}
