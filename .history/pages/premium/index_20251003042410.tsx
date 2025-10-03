// pages/premium/index.tsx
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ThemeSwitcherPremium } from '@/premium-ui/theme/ThemeSwitcher';
import { PrCard } from '@/premium-ui/components/PrCard';
import { PrButton } from '@/premium-ui/components/PrButton';

/**
 * Server redirects are handled by middleware + pricing page.
 * This page focuses on rendering the Premium hub UI.
 */
export default function PremiumHome() {
  const router = useRouter();

  return (
    <main className="pr-p-6 pr-space-y-6">
      <header className="pr-flex pr-items-center pr-justify-between">
        <h1 className="pr-text-h2 pr-font-semibold">Premium Exam Room</h1>
        <ThemeSwitcherPremium />
      </header>

      <div className="pr-grid md:pr-grid-cols-2 pr-gap-6">
        <PrCard className="pr-p-6">
          <h2 className="pr-text-h4 pr-font-semibold">IELTS Listening</h2>
          <p className="pr-muted pr-mt-2">Strict playback, timers, and section navigation.</p>
          <div className="pr-mt-4 pr-flex pr-gap-3">
            <PrButton onClick={() => router.push('/premium/listening/sample-test')}>
              Start Sample Test
            </PrButton>
            <Link href="/listening" className="pr-text-small pr-underline pr-underline-offset-2">
              Practice mode
            </Link>
          </div>
        </PrCard>

        <PrCard className="pr-p-6">
          <h2 className="pr-text-h4 pr-font-semibold">IELTS Reading</h2>
          <p className="pr-muted pr-mt-2">Passage panes, answers grid, and review flags.</p>
          <div className="pr-mt-4 pr-flex pr-gap-3">
            <PrButton onClick={() => router.push('/premium/reading/sample-test')}>
              Start Sample Test
            </PrButton>
            <Link href="/reading" className="pr-text-small pr-underline pr-underline-offset-2">
              Practice mode
            </Link>
          </div>
        </PrCard>
      </div>
    </main>
  );
}
