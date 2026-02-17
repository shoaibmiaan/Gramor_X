// pages/vocabulary/speaking/index.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

const speakingTopics = [
  {
    id: 'family',
    label: 'Family & relationships',
    level: 'Core',
    useCases: 'Part 1 & Part 2',
  },
  {
    id: 'hometown',
    label: 'Hometown & places',
    level: 'Core',
    useCases: 'Part 1',
  },
  {
    id: 'work',
    label: 'Work & studies',
    level: 'Core',
    useCases: 'Part 1 & Part 3',
  },
  {
    id: 'free-time',
    label: 'Hobbies & free time',
    level: 'Core',
    useCases: 'Part 1 & Part 2',
  },
  {
    id: 'travel',
    label: 'Travel & holidays',
    level: 'Rocket',
    useCases: 'Part 2 & Part 3',
  },
  {
    id: 'technology',
    label: 'Technology',
    level: 'Rocket',
    useCases: 'Part 3',
  },
  {
    id: 'health',
    label: 'Health & lifestyle',
    level: 'Rocket',
    useCases: 'Part 2 & Part 3',
  },
  {
    id: 'environment',
    label: 'Environment & pollution',
    level: 'Rocket',
    useCases: 'Part 3',
  },
];

export default function SpeakingPacksIndexPage() {
  return (
    <>
      <Head>
        <title>Speaking Packs — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* Header */}
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Speaking packs
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Vocabulary for real IELTS speaking topics
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              Sound natural, not robotic. Each pack gives you phrases for Part 1, Part 2 and
              Part 3 so you&apos;re not stuck repeating &quot;very&quot; and
              &quot;nice&quot; every time.
            </p>
          </div>

          {/* Overview teaser */}
          <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card className="rounded-ds-2xl border border-border/60 bg-card/60 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="Mic" size={20} />
                </span>
                <div>
                  <h2 className="font-slab text-h2">How to use these packs</h2>
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t memorise full answers. Steal phrases, structures, and a few
                    key adjectives you actually like.
                  </p>
                </div>
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Pick one topic — ideally one you hate or feel weak in.</li>
                <li>Note 5–8 phrases for Part 1, a few for Part 2 description, and 3–4 for Part 3.</li>
                <li>Mix them into your own answers. Don&apos;t copy whole paragraphs.</li>
                <li>Repeat the topic after a few days to make the vocab automatic.</li>
              </ol>
            </Card>

            <Card className="rounded-ds-2xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Example topic
                </p>
                <h2 className="mt-2 font-slab text-h3">Family & relationships</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Part 1 & Part 2 phrases to talk about your family without sounding like a
                  textbook.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Badge size="xs" variant="neutral">
                  Part 1 small talk
                </Badge>
                <Badge size="xs" variant="neutral">
                  Part 2 description
                </Badge>
                <Badge size="xs" variant="accent">
                  Natural collocations
                </Badge>
              </div>
              <div className="mt-4">
                <Button size="sm" className="rounded-ds-xl" asChild>
                  <Link href="/vocabulary/speaking/family">Open sample pack</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Topic grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {speakingTopics.map((topic) => (
              <Card
                key={topic.id}
                className="flex flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/60 p-5 transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon name="MessageCircle" size={16} />
                      </span>
                      <div>
                        <h2 className="font-semibold text-foreground">{topic.label}</h2>
                        <p className="text-xs text-muted-foreground">{topic.useCases}</p>
                      </div>
                    </div>
                    <Badge
                      size="xs"
                      variant={topic.level === 'Core' ? 'neutral' : 'accent'}
                    >
                      {topic.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vocab + phrases organised by Part 1, Part 2 and Part 3 with natural
                    examples.
                  </p>
                </div>
                <div className="mt-4">
                  <Button size="sm" className="w-full rounded-ds-xl" asChild>
                    <Link href={`/vocabulary/speaking/${topic.id}`}>Open pack</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
