// pages/vocabulary/topics/index.tsx
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import Icon from '@/components/design-system/Icon';

const topics = [
  { id: 'education', label: 'Education', level: 'Core', count: 32 },
  { id: 'environment', label: 'Environment', level: 'Core', count: 28 },
  { id: 'technology', label: 'Technology', level: 'Rocket', count: 40 },
  { id: 'health', label: 'Health', level: 'Rocket', count: 34 },
  { id: 'crime', label: 'Crime & punishment', level: 'Rocket', count: 29 },
  { id: 'work', label: 'Work & careers', level: 'Core', count: 31 },
  { id: 'society', label: 'Society & culture', level: 'Rocket', count: 27 },
  { id: 'globalisation', label: 'Globalisation', level: 'Rocket', count: 22 },
];

export default function VocabTopicsIndexPage() {
  return (
    <>
      <Head>
        <title>Topic Packs — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Topic packs
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Vocabulary for common IELTS topics
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              Learn topic-specific vocabulary for the most common IELTS Writing & Speaking
              themes so you don&apos;t freeze when the question appears.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topics.map((topic) => (
              <Card
                key={topic.id}
                className="flex flex-col justify-between rounded-ds-2xl border border-border/60 bg-card/60 p-5 transition hover:-translate-y-1 hover:bg-card/90 hover:shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon name="Folder" size={16} />
                      </span>
                      <h2 className="font-semibold text-foreground">{topic.label}</h2>
                    </div>
                    <Badge size="xs" variant={topic.level === 'Core' ? 'neutral' : 'accent'}>
                      {topic.level}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topic.count}+ band 6–8 words with examples for both Writing and Speaking.
                  </p>
                </div>
                <div className="mt-4">
                  <Button size="sm" className="w-full rounded-ds-xl" asChild>
                    <Link href={`/vocabulary/topics/${topic.id}`}>Open pack</Link>
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
