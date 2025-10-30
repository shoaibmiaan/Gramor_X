import Head from 'next/head';
import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { GradientText } from '@/components/design-system/GradientText';
import { Heading } from '@/components/design-system/Heading';

const featureHighlights = [
  {
    title: 'Context-first drills',
    description:
      'See every headword in academic, professional, and conversational settings so you never memorise words in isolation.',
  },
  {
    title: 'AI voice companions',
    description:
      'Shadow natural pronunciation, receive instant phonetic feedback, and strengthen listening recall on the go.',
  },
  {
    title: 'Adaptive review loops',
    description:
      'Smart spacing keeps mastered vocabulary fresh while surfacing weak spots with targeted quizzes and prompts.',
  },
];

const applicationTracks = [
  {
    label: 'Writing studio',
    title: 'Transform ideas into high-band essays',
    body: `Generate outlines, build topic sentences, and weave band 9 vocabulary into your Task 1 and Task 2 drafts. The studio suggests
supporting evidence and cohesion markers so your arguments stay clear.`,
    cta: {
      href: '/writing',
      label: 'Open writing tools',
    },
  },
  {
    label: 'Speaking lab',
    title: 'Practice fluent delivery with feedback',
    body: `Simulate Part 1, 2, and 3 interviews with timed prompts. Upload responses to receive fluency, lexical resource, and pronunciation insights.`,
    cta: {
      href: '/speaking',
      label: 'Start a speaking session',
    },
  },
  {
    label: 'Reading companion',
    title: 'Decode dense passages with ease',
    body: `Tackle Cambridge-style excerpts that highlight the target vocabulary in context. Guided skimming and scanning tips reduce second-guessing on exam day.`,
    cta: {
      href: '/reading',
      label: 'Browse reading drills',
    },
  },
];

const stats = [
  { value: '2,500+', label: 'IELTS-ready word families curated by experts' },
  { value: '94%', label: 'Learners report faster recall after two weeks' },
  { value: '15 min', label: 'Average daily routine that fits any schedule' },
];

export default function InfiniteApplicationsPage() {
  return (
    <>
      <Head>
        <title>Infinite Applications • Vocabulary • Gramor_X</title>
        <meta
          name="description"
          content="Bring every vocabulary word to life with scenario-based drills, AI speaking partners, and adaptive review routines."
        />
      </Head>

      <main className="bg-background">
        <section className="border-b border-border/50 bg-muted/30 py-24 dark:bg-gradient-to-br dark:from-nightStart dark:via-nightMid dark:to-nightEnd">
          <Container className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-6">
              <Badge variant="neutral" size="sm">
                Vocabulary
              </Badge>
              <Heading as="h1" size="2xl" className="space-y-2">
                <GradientText className="block text-balance">Infinite Applications</GradientText>
                <span className="block text-balance text-muted-foreground">
                  Move beyond flashcards. Apply every word in writing, speaking, listening, and reading scenarios crafted for IELTS success.
                </span>
              </Heading>
              <div className="flex flex-wrap gap-3">
                <Button as={Link as any} href="/signup" size="lg" variant="primary" className="rounded-ds">
                  Create a free account
                </Button>
                <Button as={Link as any} href="/vocabulary" size="lg" variant="ghost" className="rounded-ds">
                  Explore the word library
                </Button>
              </div>
            </div>

            <Card className="max-w-md space-y-4 rounded-ds-3xl border-primary/20 bg-card/70 p-6 shadow-xl shadow-primary/20">
              <p className="text-caption font-medium uppercase tracking-[0.2em] text-primary/80">
                Daily routine snapshot
              </p>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="rounded-ds-2xl border border-border/40 bg-background/80 p-3">
                  <strong className="text-foreground">Warm-up</strong> — unlock a contextual definition, pronunciation, and usage video.
                </li>
                <li className="rounded-ds-2xl border border-border/40 bg-background/80 p-3">
                  <strong className="text-foreground">Apply</strong> — craft sentences, paraphrase prompts, and receive AI-guided corrections.
                </li>
                <li className="rounded-ds-2xl border border-border/40 bg-background/80 p-3">
                  <strong className="text-foreground">Reflect</strong> — check mastery indicators and queue tomorrow’s review set.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Everything syncs automatically across mobile and desktop so you can continue exactly where you left off.
              </p>
            </Card>
          </Container>
        </section>

        <section className="py-20">
          <Container className="space-y-12">
            <div className="max-w-2xl space-y-4">
              <Heading as="h2" size="xl">
                Built for productive vocabulary mastery
              </Heading>
              <p className="text-body text-muted-foreground">
                Infinite Applications threads each word through authentic contexts, spaced review, and on-demand coaching so you can deploy vocabulary confidently in every exam module.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <Card key={feature.title} className="h-full rounded-ds-3xl border border-border/40 bg-card/70 p-6">
                  <h3 className="text-h4 font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="bg-muted/40 py-20 dark:bg-slate-950/60">
          <Container className="space-y-12">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl space-y-2">
                <Heading as="h2" size="xl">
                  Apply words where it matters most
                </Heading>
                <p className="text-body text-muted-foreground">
                  Follow guided tracks that blend vocabulary practice with the specific outcomes examiners expect across the four IELTS skills.
                </p>
              </div>
              <Button as={Link as any} href="/practice" variant="outline" size="lg" className="rounded-ds">
                View all practice modules
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {applicationTracks.map((track) => (
                <Card key={track.title} className="flex h-full flex-col justify-between rounded-ds-3xl border border-border/40 bg-background/80 p-6">
                  <div className="space-y-4">
                    <Badge variant="secondary" size="sm" className="uppercase tracking-wide">
                      {track.label}
                    </Badge>
                    <h3 className="text-h4 font-semibold text-foreground">{track.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{track.body}</p>
                  </div>
                  <Button as={Link as any} href={track.cta.href} variant="ghost" className="mt-6 w-fit rounded-ds">
                    {track.cta.label}
                  </Button>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-20">
          <Container className="space-y-12">
            <div className="grid gap-6 md:grid-cols-3">
              {stats.map((item) => (
                <Card key={item.label} className="rounded-ds-3xl border border-border/40 bg-card/80 p-6 text-center">
                  <p className="text-4xl font-semibold text-primary">{item.value}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.label}</p>
                </Card>
              ))}
            </div>

            <Card className="rounded-ds-3xl border border-primary/30 bg-primary/5 p-8 text-center shadow-lg shadow-primary/20">
              <Heading as="h2" size="lg" className="text-balance">
                Ready to turn vocabulary knowledge into confident performance?
              </Heading>
              <p className="mt-3 text-body text-muted-foreground">
                Join thousands of learners who combine Infinite Applications with our IELTS mock rooms, analytics, and tutoring network.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button as={Link as any} href="/signup" size="lg" variant="primary" className="rounded-ds">
                  Get started free
                </Button>
                <Button as={Link as any} href="/contact" size="lg" variant="ghost" className="rounded-ds">
                  Talk to our team
                </Button>
              </div>
            </Card>
          </Container>
        </section>
      </main>
    </>
  );
}
