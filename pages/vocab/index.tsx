import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import * as React from 'react';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { WordReveal } from '@/components/vocab/WordReveal';
import type { WordOfDay } from '@/lib/vocabulary/today';
import { getWordOfDay } from '@/lib/vocabulary/today';

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

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-warning"
              >
                {error}
              </div>
            ) : null}

            <WordReveal
              date={date ?? undefined}
              word={word}
              source={source ?? undefined}
              isLoading={!word && loading}
            />
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
