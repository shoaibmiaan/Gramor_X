// pages/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/design-system/Icon';
import { Container } from '@/components/design-system/Container';
import { useLocale } from '@/lib/locale';

/**
 * Chunk-split sections. Keep Hero interactive while server-rendering
 * the rest for SEO + perf. Provide lightweight fallbacks.
 */
const Hero = dynamic(
  () => import('@/components/sections/Hero').then((m: any) => m.Hero ?? m.default),
  { ssr: true, loading: () => <div className="min-h-[50vh]" /> }
);

const Modules = dynamic(
  () => import('@/components/sections/Modules').then((m: any) => m.Modules ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const Testimonials = dynamic(
  () =>
    import('@/components/sections/Testimonials').then(
      (m: any) => m.Testimonials ?? m.default
    ),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const Pricing = dynamic(
  () => import('@/components/sections/Pricing').then((m: any) => m.Pricing ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const Waitlist = dynamic(
  () => import('@/components/sections/Waitlist').then((m: any) => m.Waitlist ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const statHighlights = [
  {
    icon: 'Trophy',
    label: 'Average 1.5 band jump',
    description: 'Learners who follow the adaptive plan for 6 weeks or more.',
  },
  {
    icon: 'Clock',
    label: '45-minute smart sessions',
    description: 'Blend of skills, strategy, and exam drills to fit busy schedules.',
  },
  {
    icon: 'MessageCircle',
    label: '24/7 AI + human feedback',
    description: 'Instant scoring plus teacher review queues when you need nuance.',
  },
] as const;

function SectionSkeleton() {
  return (
    <div className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-8 w-40 rounded bg-border/70" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLocale();

  // streak logic unchanged
  const [streak, setStreak] = useState(0);
  const onStreakChange = useCallback((n: number) => setStreak(n), []);

  // Smooth scroll for same-page anchors (accessible + passive)
  useEffect(() => {
    const clickHandler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const a = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute('href');
      if (!href || href.length < 2) return;

      const id = href.slice(1);
      const el = document.getElementById(id);
      if (!el) return;

      ev.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', href);
    };

    document.addEventListener('click', clickHandler, { passive: true } as any);
    return () => document.removeEventListener('click', clickHandler);
  }, []);

  return (
    <>
      <Head>
        <title>{t('home.title') || 'Gramor – IELTS Prep'}</title>
        {/* Keep viewport only here (per-page), not in _document */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Skip link for a11y */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-foreground focus:shadow"
      >
        Skip to main content
      </a>

      <main id="main" className="min-h-[100dvh]">
        <Hero streak={streak} onStreakChange={onStreakChange} />

        <section className="border-y border-border/40 bg-white/80 py-12 backdrop-blur dark:bg-dark/60">
          <Container>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {statHighlights.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-electricBlue/10 text-electricBlue">
                    <Icon name={stat.icon} size={26} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{stat.label}</h3>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section
          id="modules"
          aria-label="IELTS Modules"
          className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        >
          <Modules />
        </section>

        <section
          id="testimonials"
          aria-label="Student Testimonials"
          className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        >
          <Testimonials />
        </section>

        <section
          id="pricing"
          aria-label="Pricing Plans"
          className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        >
          <Pricing />
        </section>

        <section
          id="waitlist"
          aria-label="Join the Waitlist"
          className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        >
          <Waitlist />
        </section>
      </main>
    </>
  );
}
