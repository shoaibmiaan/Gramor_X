// pages/vocabulary/topics/[topic].tsx
import React, { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';

const dummyWords = [
  {
    word: 'Curriculum',
    type: 'noun',
    band: '6.5–7.5',
    example:
      'Governments should regularly update the school curriculum to match labour market needs.',
    note: 'Useful in Writing Task 2 education topics.',
  },
  {
    word: 'Compulsory',
    type: 'adj.',
    band: '6.5–7.5',
    example:
      'Making community service compulsory can help students develop a stronger sense of responsibility.',
    note: 'Good alternative to “must” or “have to”.',
  },
  {
    word: 'Literacy',
    type: 'noun',
    band: '6.0–7.0',
    example:
      'Higher literacy rates often correlate with greater economic development.',
    note: 'Collocates with “rate”, “level”, “campaign”.',
  },
];

const topicTitleMap: Record<string, string> = {
  education: 'Education',
  environment: 'Environment',
  technology: 'Technology',
  health: 'Health',
  crime: 'Crime & punishment',
  work: 'Work & careers',
  society: 'Society & culture',
  globalisation: 'Globalisation',
};

export default function VocabTopicPage() {
  const router = useRouter();
  const { topic } = router.query;

  const title = useMemo(() => {
    if (!topic || Array.isArray(topic)) return 'Topic';
    return topicTitleMap[topic] ?? topic.charAt(0).toUpperCase() + topic.slice(1);
  }, [topic]);

  return (
    <>
      <Head>
        <title>{title} Vocabulary — Vocabulary Lab</title>
      </Head>

      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="mb-6 space-y-3">
            <Badge size="sm" variant="accent">
              Topic pack
            </Badge>
            <h1 className="font-slab text-display text-gradient-primary">
              {title} vocabulary
            </h1>
            <p className="max-w-2xl text-body text-grayish">
              High-value words and phrases you can drop into both Writing and Speaking
              answers on this topic.
            </p>
          </div>

          <Card className="mb-6 rounded-ds-2xl border border-border/60 bg-card/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How to use this pack
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Skim the words once to get a feel for them.</li>
              <li>Mark 5–7 words you actually like and would use.</li>
              <li>Try to write a short answer using at least 3 of them.</li>
              <li>Come back tomorrow for a quick review.</li>
            </ol>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dummyWords.map((item) => (
              <Card key={item.word} className="rounded-ds-2xl border border-border/60 bg-card/70 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold">{item.word}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  <Badge size="xs" variant="neutral">
                    Band {item.band}
                  </Badge>
                </div>
                <p className="mt-3 text-sm">
                  <span className="font-medium">Example: </span>
                  {item.example}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="xs" variant="ghost" className="rounded-ds-xl">
                    Save word
                  </Button>
                  <Button size="xs" variant="ghost" className="rounded-ds-xl">
                    Add to review
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Later, you can connect this pack to micro-quizzes and your Writing history.
            </p>
            <Button size="sm" className="rounded-ds-xl">
              Start quick quiz (coming soon)
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
