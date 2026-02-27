import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';

interface VocabItem {
  word: string;
  phonetic: string;
  pos: string;
  meaning: string;
  example: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  skillImpact: 'Writing' | 'Speaking' | 'Both';
}

// TODO: later wire this from Supabase / AI plan
const todaysWord: VocabItem = {
  word: 'Mitigate',
  phonetic: '/ˈmɪt.ɪ.ɡeɪt/',
  pos: 'verb',
  meaning: 'To make something less harmful, serious, or severe.',
  example: 'Effective time management can mitigate exam-related stress.',
  difficulty: 'medium',
  topic: 'Task 2 • Problem / Solution',
  skillImpact: 'Writing',
};

const difficultyLabel: Record<VocabItem['difficulty'], string> = {
  easy: 'Band 5–6 range',
  medium: 'Band 6.5–7.5 booster',
  hard: 'Band 8+ choice',
};

const usageContexts = [
  {
    title: 'When to use it',
    detail: 'Perfect for Task 2 body paragraphs when presenting solutions to social or academic issues.',
  },
  {
    title: 'Pair it with',
    detail: 'cause, impact, strain, disruption. It shines when you describe how a policy reduces negative outcomes.',
  },
  {
    title: 'Pronunciation tip',
    detail: 'Stress the first syllable: MI-ti-gate. Keep the middle “ti” short to sound confident in Speaking Part 3.',
  },
];

const microPractice = [
  {
    label: 'Writing drill',
    action: 'Rewrite a sentence from yesterday’s essay replacing “reduce” with “mitigate” and explain the nuance.',
  },
  {
    label: 'Speaking flash',
    action: 'Record a 30-second answer about traffic congestion using the word twice with different reasons.',
  },
  {
    label: 'Listening moment',
    action: 'During a podcast, note any synonyms (limit, soften, alleviate) and add them to your word bank.',
  },
];

const synonymNotes = [
  { term: 'alleviate', note: 'Softer tone, good for minor issues (e.g., “alleviate anxiety”).' },
  { term: 'counteract', note: 'More forceful, works when describing strategies that oppose a trend.' },
  { term: 'offset', note: 'Useful for economic topics when describing balancing effects.' },
];

export function VocabularySpotlightFeature() {
  return (
    <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-slab text-h3">Vocabulary of the Day</h3>
              <Badge size="xs" variant="accent">
                IELTS
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              One high-impact word you can actually use in your next essay or answer.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="rounded-ds-xl text-xs sm:text-sm"
          >
            <Link href="/vocabulary">Open Vocabulary Lab</Link>
          </Button>
        </div>

        {/* Main word block */}
        <div className="flex flex-col gap-3 rounded-ds-2xl bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-display font-semibold capitalize">
                {todaysWord.word}
              </span>
              <Badge size="xs" variant="soft" tone="primary">
                {todaysWord.pos}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{todaysWord.phonetic}</p>
            <p className="text-sm">{todaysWord.meaning}</p>
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs sm:mt-0 sm:w-52">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="PenLine" size={14} />
              </span>
              <div>
                <p className="font-medium leading-tight">Best for: {todaysWord.skillImpact}</p>
                <p className="text-[11px] text-muted-foreground">
                  Great for formal essays, causes / effects, and problem–solution answers.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <Icon name="SignalHigh" size={14} />
              </span>
              <div>
                <p className="font-medium leading-tight">
                  {difficultyLabel[todaysWord.difficulty]}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Fits well if you&apos;re aiming {todaysWord.difficulty === 'easy'
                    ? 'to get stable 6+'
                    : todaysWord.difficulty === 'medium'
                    ? 'for 6.5–7.5'
                    : 'for 8+'}
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Example & topic row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="border-l-4 border-primary/40 pl-4 text-sm italic text-muted-foreground">
            “{todaysWord.example}”
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {todaysWord.topic && (
              <Badge size="sm" variant="soft" tone="secondary">
                {todaysWord.topic}
              </Badge>
            )}
            <Badge size="sm" variant="soft" tone="info">
              Daily word • 1 of 5
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="primary" className="rounded-ds-xl">
            Add to My Words
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-ds-xl"
            asChild
          >
            <Link href="/vocabulary/quiz/today">Quick Quiz</Link>
          </Button>
          <Button size="sm" variant="ghost" className="rounded-ds-xl" asChild>
            <Link href="/vocabulary/my-words">Review saved</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function WordOfTheDayDeepDive() {
  return (
    <section className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <VocabularySpotlightFeature />

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="rounded-ds-2xl border border-border/60 bg-card/60 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge size="xs" variant="soft" tone="info">
                Deep dive
              </Badge>
              <p className="text-xs text-muted-foreground">Master today’s word in 10 focused minutes.</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {usageContexts.map((context) => (
                <div key={context.title} className="rounded-ds-xl border border-border/40 bg-background/80 p-4">
                  <p className="text-sm font-semibold text-foreground">{context.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{context.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Example sentence</p>
              <blockquote className="mt-3 rounded-ds-2xl bg-muted/30 p-4 text-sm italic text-muted-foreground">
                “{todaysWord.example}”
              </blockquote>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="BookOpen" size={16} />
                Synonyms & tone
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {synonymNotes.map((synonym) => (
                  <li key={synonym.term} className="rounded-ds-lg bg-muted/30 p-3">
                    <p className="font-medium text-foreground">{synonym.term}</p>
                    <p className="text-xs text-muted-foreground">{synonym.note}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="Timer" size={16} />
                10-minute routine
              </div>
              <ul className="mt-4 space-y-3 text-sm">
                {microPractice.map((item) => (
                  <li key={item.label} className="rounded-ds-lg border border-border/40 p-3">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VocabularySpotlightFeature;
