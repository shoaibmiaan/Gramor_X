import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import dynamic from 'next/dynamic';

import { WordReveal } from '@/components/vocab/WordReveal';
import type { MeaningQuizProps } from '@/components/vocab/MeaningQuiz';
import type { SentencePracticeProps } from '@/components/vocab/SentencePractice';
import type { SynonymRushProps } from '@/components/vocab/SynonymRush';
import type { RewardsPanelProps } from '@/components/vocab/RewardsPanel';
import { Card } from '@/components/design-system/Card';
import StreakChip from '@/components/user/StreakChip';
import { useStreak } from '@/hooks/useStreak';
import type { WordOfDay } from '@/lib/vocabulary/today';
import { getWordOfDay } from '@/lib/vocabulary/today';
import { track } from '@/lib/analytics/track';

const LoadingCard = ({
  title,
  description,
  rows = 3,
}: {
  title: string;
  description: string;
  rows?: number;
}) => (
  <Card className="animate-pulse p-6" aria-hidden="true">
    <div className="space-y-3">
      <h2 className="text-h4 font-semibold text-foreground/60">{title}</h2>
      <p className="text-body text-mutedText/70">{description}</p>
      {Array.from({ length: rows }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="h-10 w-full rounded-xl bg-muted/30" />
      ))}
    </div>
  </Card>
);

const MeaningQuizSection = dynamic<MeaningQuizProps>(
  () => import('@/components/vocab/MeaningQuiz').then((mod) => mod.MeaningQuiz),
  {
    loading: () => (
      <LoadingCard title="Meaning quiz" description="Loading answer choices…" rows={4} />
    ),
  },
);

const SentencePracticeSection = dynamic<SentencePracticeProps>(
  () => import('@/components/vocab/SentencePractice').then((mod) => mod.SentencePractice),
  {
    loading: () => (
      <LoadingCard title="Sentence practice" description="Summoning the AI coach…" rows={2} />
    ),
    ssr: false,
  },
);

const SynonymRushSection = dynamic<SynonymRushProps>(
  () => import('@/components/vocab/SynonymRush').then((mod) => mod.SynonymRush),
  {
    loading: () => (
      <LoadingCard title="Synonym rush" description="Warming up new matches…" rows={4} />
    ),
    ssr: false,
  },
);

const RewardsPanelSection = dynamic<RewardsPanelProps>(
  () => import('@/components/vocab/RewardsPanel').then((mod) => mod.RewardsPanel),
  {
    loading: () => (
      <LoadingCard title="Rewards & leaderboard" description="Preparing celebrations…" rows={3} />
    ),
    ssr: false,
  },
);

type PageProps = Readonly<{
  initialDate: string | null;
  initialWord: WordOfDay | null;
  initialSource: 'rpc' | 'view' | null;
}>;

const VocabPage: NextPage<PageProps> = ({ initialDate, initialWord, initialSource }) => {
  const [word, setWord] = React.useState<WordOfDay | null>(initialWord);
  const [date, setDate] = React.useState<string | null>(initialDate);
  const [source, setSource] = React.useState<'rpc' | 'view' | null>(initialSource);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { loading: streakLoading, current: streakCurrent, completeToday } = useStreak();
  const [streakError, setStreakError] = React.useState<string | null>(null);
  const [xpTotal, setXpTotal] = React.useState(0);
  const [attempts, setAttempts] = React.useState<{
    meaning?: { xpAwarded: number; correct: boolean; attempts: number };
    sentence?: { xpAwarded: number; score: number };
    synonyms?: { xpAwarded: number; score: number; accuracy: number };
  }>({});

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/vocab/today');
      if (!response.ok) {
        throw new Error("Failed to load today's word");
      }
      const payload = (await response.json()) as {
        date: string;
        word: WordOfDay;
        source: 'rpc' | 'view';
      };
      setWord(payload.word);
      setDate(payload.date);
      setSource(payload.source);
      setError(null);
    } catch (err) {
      console.error('[pages/vocab] refresh failed', err);
      setError("Unable to refresh today's word. Showing the most recent copy we have.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!initialWord) {
      void refresh();
    }
  }, [initialWord, refresh]);

  React.useEffect(() => {
    if (!word) {
      setAttempts({});
      setXpTotal(0);
      return;
    }
    setAttempts({});
    setXpTotal(0);
  }, [word]);

  const recordXp = React.useCallback(
    (xp: number) => {
      if (xp <= 0) return;
      setXpTotal((current) => current + xp);
      void completeToday()
        .then(() => setStreakError(null))
        .catch((err: unknown) => {
          console.warn('[pages/vocab] streak update failed', err);
          const message =
            err instanceof Error && /unauthorized/i.test(err.message)
              ? 'Sign in to sync your streak automatically.'
              : 'Streak sync delayed — your XP is safe.';
          setStreakError(message);
        });
    },
    [completeToday],
  );

  const handleMeaningComplete = React.useCallback(
    (result: { correct: boolean; xpAwarded: number }) => {
      setAttempts((current) => ({
        ...current,
        meaning: {
          xpAwarded: result.xpAwarded,
          correct: result.correct,
          attempts: (current.meaning?.attempts ?? 0) + 1,
        },
      }));
      recordXp(result.xpAwarded);
      track('vocab_meaning_submitted', {
        wordId: word?.id ?? 'unknown',
        correct: result.correct,
        xpAwarded: result.xpAwarded,
      });
    },
    [recordXp, word?.id],
  );

  const handleSentenceComplete = React.useCallback(
    (result: { score: 1 | 2 | 3; xpAwarded: number }) => {
      setAttempts((current) => ({
        ...current,
        sentence: {
          xpAwarded: result.xpAwarded,
          score: result.score,
        },
      }));
      recordXp(result.xpAwarded);
      track('vocab_sentence_submitted', {
        wordId: word?.id ?? 'unknown',
        score: result.score,
        xpAwarded: result.xpAwarded,
      });
    },
    [recordXp, word?.id],
  );

  const handleSynonymComplete = React.useCallback(
    (result: { score: number; accuracy: number; xpAwarded: number }) => {
      setAttempts((current) => ({
        ...current,
        synonyms: {
          xpAwarded: result.xpAwarded,
          score: result.score,
          accuracy: result.accuracy,
        },
      }));
      recordXp(result.xpAwarded);
      track('vocab_synonyms_submitted', {
        wordId: word?.id ?? 'unknown',
        score: result.score,
        accuracy: Number.isFinite(result.accuracy) ? result.accuracy : 0,
        xpAwarded: result.xpAwarded,
      });
    },
    [recordXp, word?.id],
  );

  return (
    <>
      <Head>
        <title>Word of the Day · GramorX</title>
        <meta
          name="description"
          content="Discover today\'s IELTS-focused vocabulary word and kick-start your practice routine."
        />
      </Head>
      <main className="bg-background text-foreground">
        <Container className="py-12 sm:py-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-h2 font-semibold tracking-tight">Vocabulary Ritual</h1>
                <p className="text-body text-mutedText">
                  Build your streak with daily IELTS-ready vocabulary.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StreakChip value={streakCurrent ?? 0} loading={streakLoading} />
                <Button
                  variant="soft"
                  tone="info"
                  onClick={() => refresh()}
                  loading={loading}
                  loadingText="Refreshing"
                  aria-label="Refresh today\'s word"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-warning"
              >
                {error}
              </div>
            ) : null}

            {streakError ? (
              <div
                role="status"
                className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-warning"
              >
                {streakError}
              </div>
            ) : null}

            <WordReveal
              date={date ?? undefined}
              word={word}
              source={source ?? undefined}
              isLoading={!word && loading}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <MeaningQuizSection word={word} onComplete={handleMeaningComplete} />
              <SentencePracticeSection word={word} onComplete={handleSentenceComplete} />
              <div className="lg:col-span-2">
                <SynonymRushSection word={word} onComplete={handleSynonymComplete} />
              </div>
              <div className="lg:col-span-2">
                <RewardsPanelSection xpTotal={xpTotal} attempts={attempts} />
              </div>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async () => {
  try {
    const result = await getWordOfDay();
    return {
      props: {
        initialDate: result?.wordDate ?? null,
        initialWord: result?.word ?? null,
        initialSource: result?.source ?? null,
      },
    };
  } catch (error) {
    console.error('[pages/vocab] failed to load word server-side', error);
    return {
      props: { initialDate: null, initialWord: null, initialSource: null },
    };
  }
};

export default VocabPage;
