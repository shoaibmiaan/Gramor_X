// pages/premium/index.tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ThemeSwitcherPremium } from '@/premium-ui/theme/ThemeSwitcher';
import { PrCard } from '@/premium-ui/components/PrCard';
import { PrButton } from '@/premium-ui/components/PrButton';

export default function PremiumHome() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Premium Exam Room</title>
        {/* Safe even if also loaded globally in _app.tsx */}
        <link rel="preload" href="/premium.css" as="style" />
        <link rel="stylesheet" href="/premium.css" />
      </Head>

      {/* Compact theme switcher */}
      <div className="pr-absolute pr-top-4 pr-right-4 pr-z-10">
        <ThemeSwitcherPremium />
      </div>

      <main className="pr-relative pr-mx-auto pr-max-w-[960px] pr-p-6 pr-space-y-6">
        {/* Header */}
        <header className="pr-space-y-1">
          <h1 className="pr-text-h2 pr-font-semibold">Premium Exam Room</h1>
          <p className="pr-muted pr-text-small">
            Distraction-free IELTS practice with strict timing.
          </p>
        </header>

        {/* Minimal content */}
        <section className="pr-grid md:pr-grid-cols-3 pr-gap-4">
          <PrCard className="pr-p-6 pr-flex pr-items-center pr-justify-between">
            <div>
              <p className="pr-text-small pr-muted">Status</p>
              <p className="pr-font-medium">Ready</p>
            </div>
            <span className="pr-badge pr-badge-success">OK</span>
          </PrCard>

          <PrCard className="pr-p-6 pr-flex pr-flex-col pr-gap-3">
            <p className="pr-text-small pr-muted">Try a module</p>
            <div className="pr-grid pr-gap-2">
              <Link href="/listening" className="pr-link pr-text-small">Listening</Link>
              <Link href="/reading" className="pr-link pr-text-small">Reading</Link>
              <Link href="/writing" className="pr-link pr-text-small">Writing</Link>
              <Link href="/speaking" className="pr-link pr-text-small">Speaking</Link>
            </div>
          </PrCard>

          <PrCard className="pr-p-6 pr-flex pr-items-center pr-justify-between">
            <div>
              <p className="pr-text-small pr-muted">Next</p>
              <p className="pr-font-medium">Take a sample test</p>
            </div>
            <PrButton onClick={() => router.push('/premium/listening/sample-test')}>
              Start
            </PrButton>
          </PrCard>
        </section>
      </main>
    </>
  );
}
