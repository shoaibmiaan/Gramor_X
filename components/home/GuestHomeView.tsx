// components/home/GuestHomeView.tsx
import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';

import type { HeroProps } from '@/components/sections/Hero';
import type { VocabularySpotlightFeatureProps } from '@/components/feature/VocabularySpotlight';
import type { HomeProps } from '@/types/home';
import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

const Hero = dynamic<HeroProps>(
  () => import('@/components/sections/Hero').then((m) => m.Hero ?? m.default),
  { ssr: true, loading: () => <div className="min-h-[50vh]" /> },
);

const Modules = dynamic(
  () => import('@/components/sections/Modules').then((m: any) => m.Modules ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> },
);

const VocabularyFeature = dynamic<VocabularySpotlightFeatureProps>(
  () =>
    import('@/components/feature/VocabularySpotlight').then((m: any) => m.VocabularySpotlightFeature ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> },
);

const SpeakingPracticeHighlight = dynamic(
  () =>
    import('@/components/sections/SpeakingPracticeHighlight').then(
      (m: any) => m.SpeakingPracticeHighlight ?? m.default,
    ),
  { ssr: true, loading: () => <SectionSkeleton /> },
);

const Testimonials = dynamic(
  () => import('@/components/sections/Testimonials').then((m: any) => m.Testimonials ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> },
);

const Pricing = dynamic(
  () => import('@/components/sections/Pricing').then((m: any) => m.Pricing ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> },
);

const Waitlist = dynamic(
  () => import('@/components/sections/Waitlist').then((m: any) => m.Waitlist ?? m.default),
  { ssr: true, loading: () => <SectionSkeleton /> },
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

const valuePillars = [
  {
    icon: 'Sparkles',
    title: 'Adaptive roadmap',
    body: 'Personalised lesson plans tuned to your target band and exam date.',
  },
  {
    icon: 'Users',
    title: 'Trusted by learners',
    body: '12k+ IELTS hopefuls rely on GramorX to keep them accountable every week.',
  },
  {
    icon: 'Gauge',
    title: 'Progress visibility',
    body: 'See predicted band, streak health, and module mastery at a glance.',
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

export interface GuestHomeViewProps {
  home: HomeProps;
}

export const GuestHomeView: React.FC<GuestHomeViewProps> = ({ home }) => {
  const [streak, setStreak] = useState(0);
  const onStreakChange = useCallback((value: number) => setStreak(value), []);

  return (
    <div className="space-y-24 pb-24">
      <Hero
        streak={streak}
        onStreakChange={onStreakChange}
        serverNowMsUTC={home.serverNowMsUTC}
        launchMsUTC={home.launchMsUTC}
      />

      <section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-8">
              <div className="space-y-6">
                <Badge variant="soft" tone="primary" size="sm">
                  Why GramorX works
                </Badge>
                <h2 className="font-slab text-3xl md:text-4xl">
                  A guided prep companion for IELTS dreamers
                </h2>
                <p className="text-base text-mutedText">
                  Curated lessons, AI feedback, and live accountability meet in one cohesive journey. Choose a lane below to
                  see how we keep you on pace.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button href="/signup" size="lg">
                    Start learning
                  </Button>
                  <Button href="/pricing" variant="soft" tone="primary" size="lg">
                    Compare plans
                  </Button>
                  <Button href="#modules" variant="ghost" size="lg">
                    Explore modules
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-background p-8">
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-foreground">Momentum metrics</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {statHighlights.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-border/50 bg-background/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon name={stat.icon} size={16} className="text-primary" />
                        {stat.label}
                      </div>
                      <p className="pt-3 text-3xl font-semibold text-foreground">{stat.metric}</p>
                      <p className="pt-2 text-xs text-mutedText">{stat.description}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {valuePillars.map((pillar) => (
                    <div key={pillar.title} className="rounded-2xl border border-border/40 bg-background/70 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Icon name={pillar.icon} size={16} className="text-primary" />
                        {pillar.title}
                      </div>
                      <p className="pt-2 text-sm text-mutedText">{pillar.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      <section id="modules">
        <Modules />
      </section>

      <section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <Badge variant="soft" tone="accent" size="sm">
                    Speaking labs
                  </Badge>
                  <h3 className="text-2xl font-semibold text-foreground">Build fluency with AI interviews</h3>
                  <p className="text-sm text-mutedText">
                    Rehearse part 1-3 questions, get instant transcripts, and surface filler words before exam day.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button href="/speaking" size="sm" variant="primary">
                      Launch a mock interview
                    </Button>
                    <Button href="/speaking#library" size="sm" variant="ghost">
                      Browse prompt library
                    </Button>
                  </div>
                </div>
                <div className="w-full max-w-md">
                  <SpeakingPracticeHighlight />
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-6">
              <div className="space-y-4">
                <Badge variant="soft" tone="info" size="sm">
                  Vocabulary spotlight
                </Badge>
                <h3 className="text-2xl font-semibold text-foreground">Curated IELTS-ready words every day</h3>
                <p className="text-sm text-mutedText">
                  Track streaks, save favourites, and join the leaderboard to build lexical resource across skills.
                </p>
                <VocabularyFeature />
              </div>
            </Card>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <Testimonials />
        </Container>
      </section>

      <section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="space-y-6 rounded-3xl border border-border/60 bg-card/95 p-8">
              <div className="space-y-3">
                <Badge variant="soft" tone="success" size="sm">
                  Ready to invest
                </Badge>
                <h3 className="font-slab text-3xl text-foreground">Flexible plans for self-paced or guided prep</h3>
                <p className="text-base text-mutedText">
                  Start free, then upgrade when you need personalised teacher feedback, extended AI tokens, and live classes.
                </p>
              </div>
              <Pricing />
            </Card>

            <Card className="space-y-6 rounded-3xl border border-border/60 bg-card/95 p-8">
              <div className="space-y-3">
                <Badge variant="soft" tone="warning" size="sm">
                  Coming soon
                </Badge>
                <h3 className="font-slab text-3xl text-foreground">Be first to join the next live cohort</h3>
                <p className="text-base text-mutedText">
                  Join the priority waitlist and we&apos;ll notify you when new live batches and pro clinics open up.
                </p>
              </div>
              <Waitlist />
            </Card>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-border/60 bg-card/95 p-8 text-center">
            <Badge variant="soft" tone="primary" size="sm">
              Join the movement
            </Badge>
            <h3 className="font-slab text-3xl text-foreground">Study smarter with the GramorX community</h3>
            <p className="max-w-3xl text-base text-mutedText">
              Unlock personalised analytics, live support, and the accountability of thousands of IELTS aspirants heading in
              the same direction.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href="/signup" size="lg">
                Create free account
              </Button>
              <Button href="/community" variant="ghost" size="lg">
                Peek into the community
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

GuestHomeView.displayName = 'GuestHomeView';

export default GuestHomeView;
