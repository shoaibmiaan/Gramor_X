// pages/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { GetServerSideProps } from 'next';
import type { HeroProps } from '@/components/sections/Hero';
import type { VocabularySpotlightFeatureProps } from '@/components/feature/VocabularySpotlight';
import type { HomeProps } from '@/types/home';
import { createGuestHomeProps } from '@/lib/home';
import { Icon } from '@/components/design-system/Icon';
import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { useLocale } from '@/lib/locale';
import { getLaunchMsUTC } from '@/lib/config/launchDate';

/**
 * Chunk-split sections. Keep Hero interactive while server-rendering
 * the rest for SEO + perf. Provide lightweight fallbacks.
 */
const Hero = dynamic<HeroProps>(
  () => import('@/components/sections/Hero').then((m) => m.Hero ?? m.default),
  { ssr: true, loading: () => <div className="min-h-[50vh]" /> }
);

const Modules = dynamic(
  () => import('@/components/sections/Modules').then((m: any) => m.Modules ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const VocabularyFeature = dynamic<VocabularySpotlightFeatureProps>(
  () =>
    import('@/components/feature/VocabularySpotlight').then(
      (m: any) => m.VocabularySpotlightFeature ?? m.default
    ),
  { ssr: true, loading: () => <SectionSkeleton /> }
);

const SpeakingPracticeHighlight = dynamic(
  () =>
    import('@/components/sections/SpeakingPracticeHighlight').then(
      (m: any) => m.SpeakingPracticeHighlight ?? m.default
    ),
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
    label: 'Average band lift',
    metric: '+1.5',
    description: 'Achieved by learners who complete 6 weeks of the adaptive pathway.',
  },
  {
    icon: 'Clock',
    label: 'Weekly time saved',
    metric: '4 hrs',
    description: 'Compared to traditional prep by batching 45-minute smart sessions.',
  },
  {
    icon: 'MessageCircle',
    label: 'Feedback turnaround',
    metric: '< 4h',
    description: 'AI instant scoring plus teacher escalations in dedicated queues.',
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

export default function HomePage({ serverNowMsUTC, launchMsUTC }: HomeProps) {
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
        <Hero
          streak={streak}
          onStreakChange={onStreakChange}
          serverNowMsUTC={serverNowMsUTC}
          launchMsUTC={launchMsUTC}
        />

        <section className="border-y border-border/40 bg-white/85 py-16 backdrop-blur dark:bg-dark/70">
          <Container>
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="info" size="sm" className="inline-flex items-center gap-2">
                <Icon name="Activity" size={16} className="text-electricBlue" />
                Outcomes we obsess over
              </Badge>
              <h2 className="mt-4 font-slab text-3xl font-semibold text-foreground sm:text-4xl">
                Built to convert daily effort into predictable band jumps
              </h2>
              <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                Our learning scientists measure every drill and feedback loop, so you know the time you invest has compounding returns.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {statHighlights.map((stat) => (
                <Card
                  key={stat.label}
                  className="border border-border/60 bg-background/80 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-electricBlue/10 text-electricBlue">
                      <Icon name={stat.icon} size={24} />
                    </div>
                    <span className="font-slab text-3xl font-semibold text-gradient-primary">{stat.metric}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{stat.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
                </Card>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <Button href="#testimonials" variant="ghost" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-electricBlue hover:border-electricBlue/40 hover:text-electricBlue">
                Explore learner case studies
              </Button>
              <span className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-xs uppercase tracking-[0.3em]">
                <Icon name="ShieldCheck" size={14} /> Score-improvement guarantee
              </span>
            </div>
          </Container>
        </section>

        <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
          <SpeakingPracticeHighlight />
        </section>

        <section
          id="vocabulary-module"
          aria-label="Vocabulary Module"
          className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90"
        >
          <VocabularyFeature variant="guestSampler" />
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

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const launchMsUTC = Math.floor(getLaunchMsUTC());
  const serverNowMsUTC = Date.now();

  return {
    props: createGuestHomeProps({
      serverNowMsUTC,
      launchMsUTC,
    }),
  };
};
