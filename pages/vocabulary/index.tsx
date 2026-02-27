// pages/vocabulary/index.tsx
import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

const VocabularyIndexPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Vocabulary Lab — Gramor_X</title>
      </Head>
      <section className="bg-lightBg py-20 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="space-y-10">
            <header className="space-y-3">
              <Badge size="sm" variant="accent">
                Vocabulary Lab
              </Badge>
              <h1 className="font-slab text-display">
                Build band 7+ vocabulary without memorising random lists.
              </h1>
              <p className="max-w-2xl text-body text-grayish">
                Topic packs, linking words, AI rewrites and quick quizzes — all wired to IELTS
                Writing & Speaking.
              </p>
            </header>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name="Sparkles" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Daily word</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    One high-impact word each day with examples, synonyms and a quick check.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/vocabulary/daily">
                    <Button className="rounded-ds-xl">Open daily vocab</Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <Icon name="Layers" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Topic packs</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Environment, education, technology and more — ready-made vocab for Writing &
                    Speaking.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/vocabulary/topic/environment">
                    <Button size="sm" className="rounded-ds-xl">
                      Environment
                    </Button>
                  </Link>
                  <Link href="/vocabulary/topic/education">
                    <Button size="sm" variant="secondary" className="rounded-ds-xl">
                      Education
                    </Button>
                  </Link>
                  <Link href="/vocabulary/topic/technology">
                    <Button size="sm" variant="ghost" className="rounded-ds-xl">
                      More topics
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-electricBlue/10 text-electricBlue">
                      <Icon name="Link2" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Linking & paraphrasing</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sound academic with proper linking words and smarter paraphrasing.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/vocabulary/linking-words">
                    <Button size="sm" className="rounded-ds-xl">
                      Linking words
                    </Button>
                  </Link>
                  <Link href="/vocabulary/ai-lab">
                    <Button size="sm" variant="secondary" className="rounded-ds-xl">
                      AI rewrite lab
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <Icon name="Mic" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Speaking packs</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cue card-ready phrases sorted by topics for Speaking Part 2 & 3.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/vocabulary/speaking">
                    <Button className="rounded-ds-xl">Speaking vocab</Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Icon name="CheckCircle2" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Quizzes & mastery</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Quick quizzes to test meaning, usage and synonym choice.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/vocabulary/quizzes">
                    <Button className="rounded-ds-xl">Start a quiz</Button>
                  </Link>
                </div>
              </Card>

              <Card className="flex flex-col justify-between rounded-ds-2xl p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-foreground">
                      <Icon name="Bookmark" size={18} />
                    </span>
                    <h2 className="font-slab text-h3">Saved words</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your personal word bank — review, tag and practise on demand.
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/vocabulary/saved">
                    <Button className="rounded-ds-xl" variant="secondary">
                      View saved words
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default VocabularyIndexPage;
