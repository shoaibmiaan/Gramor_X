// pages/vocabulary/review.tsx
import React from 'react';
import Head from 'next/head';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

export default function VocabReviewPage() {
  return (
    <>
      <Head>
        <title>Review mode — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Review mode
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Flashcard-style vocabulary review
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              Quickly cycle through saved words, test yourself, and mark which ones you
              genuinely know.
            </p>
          </div>

          <Card className="mx-auto max-w-xl rounded-ds-2xl border border-border/60 bg-card/70 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Card 1 of 10
              </p>
              <Badge size="xs" variant="neutral">
                Preview
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-lg font-semibold">Substantially</p>
              <p className="text-xs text-muted-foreground">Tap &quot;Show meaning&quot;</p>
            </div>

            <div className="rounded-ds-2xl bg-background/70 p-3 text-sm">
              <p className="font-medium">Meaning:</p>
              <p className="text-muted-foreground">
                To a large degree; considerably. (Hidden/revealed later with state)
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-ds-xl" variant="secondary">
                I knew this
              </Button>
              <Button size="sm" className="rounded-ds-xl" variant="ghost">
                I didn&apos;t know
              </Button>
              <Button size="sm" className="rounded-ds-xl" variant="ghost">
                Skip
              </Button>
            </div>

            <div className="h-1 w-full rounded-full bg-border/80">
              <div className="h-1 w-1/5 rounded-full bg-primary" />
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}
