// pages/vocabulary/speaking/[topic].tsx
import React, { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

type SpeakingPhrase = {
  phrase: string;
  meaning?: string;
  note?: string;
};

type SpeakingPack = {
  title: string;
  description: string;
  level: 'Core' | 'Rocket';
  part1: SpeakingPhrase[];
  part2: SpeakingPhrase[];
  part3: SpeakingPhrase[];
};

const packs: Record<string, SpeakingPack> = {
  family: {
    title: 'Family & relationships',
    description:
      'Talk about your family and relationships in a natural way without sounding like a textbook.',
    level: 'Core',
    part1: [
      {
        phrase: 'I come from a fairly close-knit family.',
        note: 'Nice upgrade from &quot;my family is very close&quot;.',
      },
      {
        phrase: 'I&apos;m quite close to my older sister.',
      },
      {
        phrase: 'We try to have dinner together at least a few times a week.',
      },
      {
        phrase: 'To be honest, everyone has a pretty busy schedule these days.',
        note: 'Sounds natural and conversational.',
      },
    ],
    part2: [
      {
        phrase: 'Someone I really admire is my mother because...',
      },
      {
        phrase: 'She has always been there to support me, especially when...',
      },
      {
        phrase: 'One thing I really appreciate about her is...',
      },
      {
        phrase: 'To give you a specific example, there was a time when...',
      },
    ],
    part3: [
      {
        phrase: 'In my country, family ties are still quite strong overall.',
      },
      {
        phrase: 'That said, I think younger people are becoming more independent.',
      },
      {
        phrase: 'From my perspective, one major change is that...',
      },
      {
        phrase:
          'It really depends on the family, but generally speaking, parents expect children to...',
      },
    ],
  },
  hometown: {
    title: 'Hometown & places',
    description:
      'Describe where you live with better adjectives and more realistic details.',
    level: 'Core',
    part1: [
      {
        phrase: 'I grew up in a fairly small town on the outskirts of the city.',
      },
      {
        phrase: 'It&apos;s not exactly famous, but it&apos;s known for...',
      },
      {
        phrase: 'To be honest, it&apos;s getting more crowded these days.',
      },
    ],
    part2: [
      {
        phrase: 'One place I&apos;d really recommend visiting is...',
      },
      {
        phrase: 'It has a really relaxed atmosphere, especially in the evening.',
      },
      {
        phrase: 'What I like most about it is the fact that...',
      },
    ],
    part3: [
      {
        phrase: 'I think many cities are becoming more similar due to globalisation.',
      },
      {
        phrase: 'On the plus side, people have more facilities and entertainment options.',
      },
      {
        phrase: 'On the downside, a lot of traditional buildings are being replaced.',
      },
    ],
  },
  work: {
    title: 'Work & studies',
    description:
      'Talk about your job or studies with clear, professional-sounding phrases.',
    level: 'Core',
    part1: [
      {
        phrase: 'Right now I&apos;m working as a...',
      },
      {
        phrase: 'I&apos;m currently in my final year of university, studying...',
      },
      {
        phrase: 'It&apos;s quite demanding, but I find it rewarding.',
      },
    ],
    part2: [
      {
        phrase: 'I&apos;d like to talk about a job I would really like to do in the future...',
      },
      {
        phrase: 'One main reason I&apos;m drawn to this job is that...',
      },
      {
        phrase: 'Another factor is that it would give me the chance to...',
      },
    ],
    part3: [
      {
        phrase: 'In general, I think work-life balance is getting harder to maintain.',
      },
      {
        phrase: 'Many people feel under pressure to work long hours.',
      },
      {
        phrase: 'On the other hand, remote work has given some people more flexibility.',
      },
    ],
  },
  // you can extend other topics similarly: free-time, travel, technology, etc.
};

function getPackKey(topic: string | string[] | undefined): string | null {
  if (!topic) return null;
  if (Array.isArray(topic)) return topic[0];
  return topic;
}

export default function SpeakingTopicPage() {
  const router = useRouter();
  const { topic } = router.query;

  const packKey = useMemo(() => getPackKey(topic), [topic]);
  const pack = packKey ? packs[packKey] : undefined;

  const title = pack?.title ?? 'Speaking topic';
  const level = pack?.level ?? 'Core';

  return (
    <>
      <Head>
        <title>{title} — Speaking Packs</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* Header */}
          <div className="mb-6 space-y-3">
            <Badge size="sm" variant="accent">
              Speaking pack
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              {title}
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              {pack
                ? pack.description
                : 'Topic phrases for IELTS Speaking Part 1, Part 2 and Part 3.'}
            </p>
          </div>

          {/* meta */}
          <Card className="mb-8 rounded-ds-2xl border border-border/60 bg-card/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  How to use this pack
                </p>
                <p className="text-sm text-muted-foreground">
                  Pick a few phrases you actually like and build your own answers around
                  them. You don&apos;t need to memorise everything here.
                </p>
              </div>
              <Badge size="xs" variant={level === 'Core' ? 'neutral' : 'accent'}>
                {level} pack
              </Badge>
            </div>
          </Card>

          {/* Part 1 / 2 / 3 grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Part 1 */}
            <Card className="rounded-ds-2xl border border-border/60 bg-card/60 p-5 flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Part 1
                  </p>
                  <h2 className="font-slab text-h3">Small talk & easy questions</h2>
                </div>
                <Badge size="xs" variant="neutral">
                  Warm-up
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                {(pack?.part1 ?? []).map((item, idx) => (
                  <div
                    key={`${item.phrase}-${idx}`}
                    className="rounded-ds-xl bg-background/60 p-3"
                  >
                    <p className="font-medium">&quot;{item.phrase}&quot;</p>
                    {item.note && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                ))}
                {(!pack || pack.part1.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Part 1 phrases for this topic will appear here.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="xs" variant="ghost" className="rounded-ds-xl">
                  Save pack for review
                </Button>
              </div>
            </Card>

            {/* Part 2 */}
            <Card className="rounded-ds-2xl border border-border/60 bg-card/60 p-5 flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Part 2
                  </p>
                  <h2 className="font-slab text-h3">Long turn description</h2>
                </div>
                <Badge size="xs" variant="neutral">
                  1–2 minutes
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                {(pack?.part2 ?? []).map((item, idx) => (
                  <div
                    key={`${item.phrase}-${idx}`}
                    className="rounded-ds-xl bg-background/60 p-3"
                  >
                    <p className="font-medium">&quot;{item.phrase}&quot;</p>
                    {item.note && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                ))}
                {(!pack || pack.part2.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Part 2 &quot;describe&quot; phrases will appear here.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="xs" variant="ghost" className="rounded-ds-xl">
                  Add these to cue card practice
                </Button>
              </div>
            </Card>

            {/* Part 3 */}
            <Card className="rounded-ds-2xl border border-border/60 bg-card/60 p-5 flex flex-col">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Part 3
                  </p>
                  <h2 className="font-slab text-h3">Opinion & deeper discussion</h2>
                </div>
                <Badge size="xs" variant="neutral">
                  Band 7+ vibe
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                {(pack?.part3 ?? []).map((item, idx) => (
                  <div
                    key={`${item.phrase}-${idx}`}
                    className="rounded-ds-xl bg-background/60 p-3"
                  >
                    <p className="font-medium">&quot;{item.phrase}&quot;</p>
                    {item.note && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                    )}
                  </div>
                ))}
                {(!pack || pack.part3.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    Higher-level opinion phrases will appear here.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="xs" variant="ghost" className="rounded-ds-xl">
                  Add phrases to review list
                </Button>
              </div>
            </Card>
          </div>

          {/* Footer note */}
          <p className="mt-8 text-xs text-muted-foreground">
            Later, you can connect these packs to your Speaking attempts so the system
            suggests phrases based on your weak topics and typical mistakes.
          </p>
        </Container>
      </section>
    </>
  );
}
