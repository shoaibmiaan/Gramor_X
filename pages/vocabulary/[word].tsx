import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Heading } from '@/components/design-system/Heading';
import { Separator } from '@/components/design-system/Separator';
import { PronunciationBar } from '@/components/vocab/PronunciationBar';
import { SenseList } from '@/components/vocab/SenseList';
import { WordCard } from '@/components/vocab/WordCard';
import { apiFetch } from '@/lib/db/api';
import type { WordDetail, WordDetailResponse, WordSummary } from '@/types/vocabulary';

const buildTitle = (entry?: WordDetail | null) =>
  entry ? `${entry.headword} • Vocabulary` : 'Vocabulary • Gramor_X';

export default function WordDetailPage() {
  const router = useRouter();
  const [entry, setEntry] = React.useState<WordDetail | null>(null);
  const [related, setRelated] = React.useState<WordSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    (slug: string, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      apiFetch<WordDetailResponse>(`/api/vocabulary/${encodeURIComponent(slug)}`, { signal })
        .then((response) => {
          setEntry(response.item);
          setRelated(response.item.relatedWords ?? []);
        })
        .catch((err) => {
          if ((err as Error).name === 'AbortError') return;
          const message = (err as Error)?.message ?? 'Unable to load word details.';
          setError(message);
          setEntry(null);
          setRelated([]);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [],
  );

  React.useEffect(() => {
    if (!router.isReady) return;
    const slugParam = router.query.word;
    const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
    if (!slug) return;

    const controller = new AbortController();
    load(slug, controller.signal);
    return () => controller.abort();
  }, [load, router.isReady, router.query.word]);

  const hasContent = !!entry && !loading && !error;

  return (
    <>
      <Head>
        <title>{buildTitle(entry)}</title>
      </Head>

      <main className="bg-background py-16">
        <Container className="flex max-w-4xl flex-col gap-6">
          <Button
            as={Link as any}
            href="/vocabulary"
            variant="ghost"
            size="sm"
            leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            className="w-fit"
          >
            Back to vocabulary
          </Button>

          <Card className="space-y-6 p-6">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
                Loading word details…
              </div>
            )}

            {!loading && error && (
              <Alert variant="error" title="Something went wrong.">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{error}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const slugParam = router.query.word;
                      const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;
                      if (!slug) return;
                      load(slug);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </Alert>
            )}

            {hasContent && entry && (
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Heading as="h1" size="xl">
                      {entry.headword}
                    </Heading>
                    <Badge variant="neutral">{entry.partOfSpeech}</Badge>
                    {entry.level && <Badge variant="info">Level {entry.level}</Badge>}
                    {entry.rootForm && <Badge variant="subtle">Root: {entry.rootForm}</Badge>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-small text-muted-foreground">
                    <span>Frequency score</span>
                    <Badge variant="secondary" size="sm">
                      {entry.frequencyScore ?? '—'}
                    </Badge>
                    {entry.frequencyBand && <Badge variant="subtle">{entry.frequencyBand}</Badge>}
                  </div>

                  {entry.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.categories.map((category) => (
                        <Badge key={category} variant="subtle" size="sm">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <PronunciationBar pronunciation={entry.pronunciation} />

                <Separator />

                <SenseList senses={entry.senses} />

                {entry.notes && (
                  <div className="rounded-ds-xl border border-border/60 bg-card/60 p-4 text-small text-muted-foreground">
                    {entry.notes}
                  </div>
                )}
              </div>
            )}

            {!loading && !entry && !error && (
              <EmptyState
                title="Word not found"
                description="We couldn’t find this vocabulary entry. It may have been removed or renamed."
                actions={
                  <Button as={Link as any} href="/vocabulary" variant="ghost">
                    Browse vocabulary
                  </Button>
                }
              />
            )}
          </Card>

          {hasContent && related.length > 0 && (
            <section className="space-y-4">
              <Heading as="h2" size="lg">
                Related vocabulary
              </Heading>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <WordCard key={item.id} entry={item} />
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>
    </>
  );
}
