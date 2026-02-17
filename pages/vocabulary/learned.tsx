import * as React from 'react';
import Head from 'next/head';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';
import { AudioBar } from '@/components/design-system/AudioBar';
import type { LearnedResponse, LearnedWord } from '@/pages/api/words/learned';

const formatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

type FetchState = {
  data: LearnedResponse | null;
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: FetchState = {
  data: null,
  loading: true,
  error: null,
};

const MAX_ATTRACTIONS = 3;

const SynonymPill: React.FC<{ value: string }> = ({ value }) => (
  <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-foreground/70">{value}</span>
);

const CategoryPill: React.FC<{ value: string }> = ({ value }) => (
  <Badge variant="neutral" size="xs" className="rounded-full bg-muted/70 text-[0.6rem] uppercase tracking-wide">
    {value}
  </Badge>
);

const Pronunciations: React.FC<{ pronunciations: LearnedWord['pronunciations'] }> = ({ pronunciations }) => {
  const filtered = pronunciations.filter((entry) => entry.ipa || entry.audioUrl);
  if (filtered.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Pronunciation</p>
      <div className="space-y-3">
        {filtered.map((item, index) => (
          <div
            key={`${item.locale ?? 'pron'}-${item.ipa ?? index}`}
            className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background/80 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {item.label ?? item.locale ?? 'IPA'}
              </span>
              {item.ipa && <span className="text-base font-semibold text-foreground">{item.ipa}</span>}
            </div>
            {item.audioUrl && <AudioBar src={item.audioUrl} preload="none" className="sm:ml-auto sm:w-auto" />}
          </div>
        ))}
      </div>
    </div>
  );
};

function buildAttractions(words: LearnedWord[]) {
  if (words.length === 0) {
    return [
      {
        icon: 'Sparkles' as const,
        title: 'Start your streak',
        subtitle: 'Learn your first word to unlock streak celebrations and personalised drills.',
      },
    ];
  }

  const uniqueDays = new Set(words.map((word) => formatter.format(new Date(word.learnedOn))));
  const categoryCounts = new Map<string, number>();
  let audioRich = 0;

  for (const word of words) {
    for (const category of word.categories) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }
    if (word.pronunciations.some((pron) => pron.audioUrl)) {
      audioRich += 1;
    }
  }

  const topCategory = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  const attractions = [
    {
      icon: 'Flame' as const,
      title: `${words.length} words locked`,
      subtitle: `${uniqueDays.size} learning day${uniqueDays.size === 1 ? '' : 's'} captured in your streak log.`,
    },
    topCategory
      ? {
          icon: 'Shapes' as const,
          title: `Vocabulary magnet: ${topCategory}`,
          subtitle: `You gravitate towards ${topCategory.toLowerCase()} vocabulary — keep diversifying for range.`,
        }
      : null,
    {
      icon: 'AudioLines' as const,
      title: `${audioRich} audio journeys`,
      subtitle: 'Replay pronunciation drills to sharpen your speaking and listening accent targets.',
    },
  ].filter(Boolean);

  return attractions.slice(0, MAX_ATTRACTIONS) as {
    icon: 'Flame' | 'Shapes' | 'AudioLines' | 'Sparkles';
    title: string;
    subtitle: string;
  }[];
}

function LearnedWordCard({ word }: { word: LearnedWord }) {
  return (
    <Card padding="lg" className="h-full border-border/60">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">
        <Icon name="BookmarkCheck" size={16} />
        Learned {formatter.format(new Date(word.learnedOn))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h3 className="text-2xl font-semibold capitalize text-foreground">{word.word}</h3>
        {word.partOfSpeech && <Badge variant="subtle">{word.partOfSpeech}</Badge>}
      </div>
      <p className="mt-2 text-base text-muted-foreground">{word.meaning}</p>
      {word.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {word.categories.map((category) => (
            <CategoryPill key={category} value={category} />
          ))}
        </div>
      )}
      {word.synonyms.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {word.synonyms.map((synonym) => (
            <SynonymPill key={synonym} value={synonym} />
          ))}
        </div>
      )}
      {word.example && (
        <p className="mt-4 text-sm italic text-muted-foreground">“{word.example}”</p>
      )}
      {word.interest && (
        <p className="mt-3 text-sm text-primary">{word.interest}</p>
      )}
      <Pronunciations pronunciations={word.pronunciations} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          href={`/vocabulary/${encodeURIComponent(word.word)}`}
          variant="soft"
          tone="info"
          trailingIcon={<Icon name="ArrowUpRight" size={16} />}
        >
          Revisit word
        </Button>
        <Button
          href={`/ai/coach?focus=${encodeURIComponent(word.word)}`}
          variant="ghost"
          trailingIcon={<Icon name="Sparkles" size={16} />}
        >
          Coach me on this
        </Button>
      </div>
    </Card>
  );
}

export default function LearnedWordsPage() {
  const [state, setState] = React.useState<FetchState>(INITIAL_STATE);

  const load = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/words/learned', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Could not load your learned words.');
      }
      const json = (await res.json()) as LearnedResponse;
      const sanitized: LearnedResponse = {
        ...json,
        words: (json.words ?? []).map((word) => ({
          ...word,
          synonyms: Array.isArray(word.synonyms)
            ? word.synonyms
                .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                .filter((entry): entry is string => entry.length > 0)
            : [],
          categories: Array.isArray(word.categories)
            ? word.categories
                .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
                .filter((entry): entry is string => entry.length > 0)
            : [],
          pronunciations: Array.isArray(word.pronunciations)
            ? word.pronunciations
                .map((entry) => ({
                  ipa: typeof entry?.ipa === 'string' && entry.ipa.trim().length > 0 ? entry.ipa.trim() : null,
                  audioUrl:
                    typeof entry?.audioUrl === 'string' && entry.audioUrl.trim().length > 0 ? entry.audioUrl.trim() : null,
                  locale: typeof entry?.locale === 'string' && entry.locale.trim().length > 0 ? entry.locale.trim() : null,
                  label: typeof entry?.label === 'string' && entry.label.trim().length > 0 ? entry.label.trim() : null,
                }))
                .filter((entry) => entry.ipa || entry.audioUrl || entry.locale || entry.label)
            : [],
        })),
      };
      setState({ data: sanitized, loading: false, error: null });
    } catch (err) {
      console.warn('[LearnedWordsPage] failed to load', err);
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Unexpected error' });
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const words = state.data?.words ?? [];
  const attractions = React.useMemo(() => buildAttractions(words), [words]);
  const lastLearned = words[0]?.learnedOn ? formatter.format(new Date(words[0].learnedOn)) : null;

  return (
    <>
      <Head>
        <title>Learned Words | GramorX</title>
        <meta
          name="description"
          content="Review every IELTS-ready word you have mastered so far, revisit pronunciations, and continue your streak."
        />
      </Head>
      <main className="bg-background py-16">
        <Container className="flex flex-col gap-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="info" size="sm" className="inline-flex items-center gap-2">
              <Icon name="BookmarkCheck" size={16} className="text-electricBlue" />
              Word studio 1.1
            </Badge>
            <h1 className="mt-4 font-slab text-4xl font-semibold text-foreground sm:text-5xl">Your learned words</h1>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Celebrate mastered vocabulary, replay pronunciations, and keep your daily boost alive.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Badge variant="neutral" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
                Daily boost
              </Badge>
              <Badge variant="neutral" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
                Audio rich
              </Badge>
              <Badge variant="neutral" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
                Adaptive review
              </Badge>
              {lastLearned && (
                <Badge variant="info" size="xs" className="uppercase tracking-[0.35em] text-[0.6rem]">
                  Last entry {lastLearned}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
            <div className="space-y-6">
              {state.loading && !state.data && (
                <Card padding="lg" className="space-y-4">
                  <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
                </Card>
              )}

              {state.error && (
                <Card padding="lg" className="border-destructive/40 bg-destructive/5 text-destructive">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{state.error}</span>
                    <Button size="sm" variant="ghost" onClick={() => void load()}>
                      Try again
                    </Button>
                  </div>
                </Card>
              )}

              {words.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {words.map((word) => (
                    <LearnedWordCard key={`${word.id}-${word.learnedOn}`} word={word} />
                  ))}
                </div>
              ) : (
                !state.loading && (
                  <Card padding="lg" className="border-dashed border-electricBlue/40 bg-electricBlue/10 text-center">
                    <div className="space-y-4">
                      <Icon name="Inbox" size={28} className="mx-auto text-electricBlue" />
                      <p className="text-base font-medium text-foreground">No learned words yet</p>
                      <p className="text-sm text-muted-foreground">
                        Explore today&apos;s headword and mark it as learned to start filling this studio.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button href="/word-of-the-day" variant="primary" trailingIcon={<Icon name="Sparkles" size={16} />}>
                          Go to Word of the Day
                        </Button>
                        <Button href="/vocabulary" variant="soft" tone="info" trailingIcon={<Icon name="ArrowUpRight" size={16} />}>
                          Browse vocabulary
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              )}
            </div>

            <div className="space-y-6">
              <Card padding="lg" className="border-border/50 bg-white/80 shadow-md backdrop-blur dark:bg-dark/60">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">Attractions</p>
                <div className="mt-4 space-y-5">
                  {attractions.map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-foreground/80">
                        <Icon name={item.icon} size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card padding="lg" className="border-dashed border-electricBlue/40 bg-electricBlue/10">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-electricBlue">Keep progressing</p>
                    <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                      Dive back into today&apos;s boost or explore the full vocabulary browser to keep your streak alive.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button href="/word-of-the-day" variant="soft" tone="info" trailingIcon={<Icon name="Sparkles" size={16} />}>
                      Today&apos;s word
                    </Button>
                    <Button
                      href="/review"
                      variant="soft"
                      tone="default"
                      trailingIcon={<Icon name="ArrowRight" size={16} />}
                    >
                      Continue review
                    </Button>
                    <Button href="/vocabulary" variant="soft" tone="success" trailingIcon={<Icon name="BookmarkCheck" size={16} />}>
                      Vocabulary browser
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
