// pages/vocabulary/linking-words.tsx
import React from 'react';
import Head from 'next/head';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

const linkingGroups = [
  {
    label: 'Adding information',
    examples: [
      { phrase: 'Moreover', sentence: 'Moreover, this trend has significant social consequences.' },
      { phrase: 'In addition', sentence: 'In addition, governments should invest in public transport.' },
      { phrase: 'Furthermore', sentence: 'Furthermore, many young people struggle to find stable work.' },
    ],
  },
  {
    label: 'Contrasting ideas',
    examples: [
      { phrase: 'However', sentence: 'However, this solution may not work in rural areas.' },
      { phrase: 'On the other hand', sentence: 'On the other hand, some people prefer online learning.' },
      { phrase: 'Nevertheless', sentence: 'Nevertheless, the benefits often outweigh the drawbacks.' },
    ],
  },
  {
    label: 'Cause & effect',
    examples: [
      { phrase: 'As a result', sentence: 'As a result, pollution levels have risen sharply.' },
      { phrase: 'Therefore', sentence: 'Therefore, stricter laws are necessary.' },
      { phrase: 'Consequently', sentence: 'Consequently, many families are forced to move abroad.' },
    ],
  },
];

export default function LinkingWordsPage() {
  return (
    <>
      <Head>
        <title>Linking words — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Linking words
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Cohesion upgrades for Writing & Speaking
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              These phrases help your ideas flow logically. Use them instead of repeating
              &quot;and&quot; or &quot;but&quot; in every sentence.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {linkingGroups.map((group) => (
              <Card key={group.label} className="rounded-ds-2xl border border-border/60 bg-card/60 p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-slab text-h3">{group.label}</h2>
                  <Badge size="xs" variant="neutral">
                    Writing
                  </Badge>
                </div>
                <div className="space-y-3">
                  {group.examples.map((ex) => (
                    <div key={ex.phrase}>
                      <p className="text-sm font-semibold">{ex.phrase}</p>
                      <p className="text-xs text-muted-foreground">{ex.sentence}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Later, you can connect these to a Writing checker that flags overuse of basic
            connectors and suggests these instead.
          </p>
        </Container>
      </section>
    </>
  );
}
