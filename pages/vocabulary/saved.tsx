// pages/vocabulary/saved.tsx
import React from 'react';
import Head from 'next/head';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

const savedWords = [
  {
    word: 'Substantially',
    band: '6.5–8.0',
    example: 'The number of international students increased substantially.',
    mastered: false,
  },
  {
    word: 'Mitigate',
    band: '7.0–8.0',
    example: 'Governments can introduce laws to mitigate environmental damage.',
    mastered: true,
  },
];

export default function SavedWordsPage() {
  return (
    <>
      <Head>
        <title>Saved words — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-8 space-y-3">
            <Badge size="sm" variant="accent">
              Your words
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              Saved vocabulary
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              Words you decided to keep. Turn this list into flashcards or quiz sessions
              when you have a few spare minutes.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Saved: {savedWords.length}</span>
              <span>• Mastered: {savedWords.filter((w) => w.mastered).length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="rounded-ds-xl" asChild>
                <a href="/vocabulary/review">Start review mode</a>
              </Button>
              <Button size="sm" variant="ghost" className="rounded-ds-xl" disabled>
                Export (coming soon)
              </Button>
            </div>
          </div>

          {savedWords.length === 0 ? (
            <Card className="rounded-ds-2xl border border-dashed border-border/60 bg-card/50 p-6">
              <p className="text-sm font-medium">
                No saved words yet. Start from the Daily Word or any topic pack and hit
                &quot;Save word&quot;.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedWords.map((item) => (
                <Card key={item.word} className="rounded-ds-2xl border border-border/60 bg-card/60 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">{item.word}</p>
                      <p className="text-xs text-muted-foreground">Band {item.band}</p>
                    </div>
                    <Badge
                      size="xs"
                      variant={item.mastered ? 'success' : 'neutral'}
                    >
                      {item.mastered ? 'Mastered' : 'Learning'}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm">
                    <span className="font-medium">Example: </span>
                    {item.example}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="xs" variant="ghost" className="rounded-ds-xl">
                      Toggle mastered
                    </Button>
                    <Button size="xs" variant="ghost" className="rounded-ds-xl">
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
