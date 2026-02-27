// pages/vocabulary/synonyms.tsx
import React from 'react';
import Head from 'next/head';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

const synonymSets = [
  {
    basic: 'Very big',
    better: ['massive', 'enormous', 'substantial', 'significant'],
    note: 'Useful for describing changes in graphs or major problems.',
  },
  {
    basic: 'Very important',
    better: ['crucial', 'vital', 'essential', 'of great significance'],
    note: 'Good for Writing Task 2 when explaining key reasons.',
  },
  {
    basic: 'A lot of',
    better: ['a large number of', 'a significant amount of', 'a considerable proportion of'],
    note: 'Avoids repetition of &quot;a lot of&quot; in formal essays.',
  },
];

export default function SynonymLabPage() {
  return (
    <>
      <Head>
        <title>Synonym Lab — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Synonym lab
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Replace basic phrases with academic ones
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              Level up from &quot;very big&quot; and &quot;a lot of&quot; to words that
              actually match band 7–8 Writing and Speaking.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {synonymSets.map((set) => (
              <Card key={set.basic} className="rounded-ds-2xl border border-border/60 bg-card/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Instead of
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{set.basic}</p>

                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Try
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {set.better.map((w) => (
                    <li key={w} className="flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                      {w}
                    </li>
                  ))}
                </ul>

                <p className="mt-3 text-xs text-muted-foreground">{set.note}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
