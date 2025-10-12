'use client';

import React, { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';

import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import MistakeCard, { type Mistake } from '@/components/mistakes/MistakeCard';
import {
  fetchMistakePage,
  recordMistakeReview,
  resolveMistake,
  type MistakePage,
  type MistakeRecord,
} from '@/lib/mistakes';

const PAGE_SIZE = 10;

export default function MistakesPage() {
  const getKey = useCallback(
    (index: number, previousPage: MistakePage | null) => {
      if (previousPage && !previousPage.nextCursor) return null;
      const cursor = index === 0 ? undefined : previousPage?.nextCursor ?? undefined;
      return { cursor, limit: PAGE_SIZE } as const;
    },
    [],
  );

  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite<MistakePage>(
    getKey,
    ({ cursor, limit }) => fetchMistakePage({ cursor, limit }),
    { revalidateFirstPage: false },
  );

  const pages = data ?? [];
  const mistakes = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const loadingInitial = !data && !error;
  const hasMore = pages.length > 0 ? Boolean(pages[pages.length - 1]?.nextCursor) : true;
  const loadingMore = isValidating && size > (data?.length ?? 0);

  const handleReview = useCallback(
    async (mistake: Mistake) => {
      const nextReps = mistake.repetitions + 1;
      const updated = await recordMistakeReview({
        id: mistake.id,
        repetitions: nextReps,
      });

      await mutate(
        (pages) =>
          pages?.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === mistake.id ? mapToMistake(item, updated) : item)),
          })) ?? null,
        { revalidate: false },
      );
    },
    [mutate],
  );

  const handleResolve = useCallback(
    async (id: string) => {
      await resolveMistake(id);
      await mutate(
        (pages) =>
          pages?.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== id),
            nextCursor: page.nextCursor,
          })) ?? null,
        { revalidate: false },
      );
    },
    [mutate],
  );

  return (
    <Container className="py-10">
      <header className="mb-8 space-y-2">
        <p className="text-caption uppercase tracking-[0.18em] text-muted-foreground">Spaced review</p>
        <h1 className="font-slab text-h2 text-foreground">Mistakes Book</h1>
        <p className="max-w-2xl text-body text-muted-foreground">
          We track incorrect answers from the last 30 days and queue them for spaced review. Mark a
          card reviewed after retrying, or resolve it once you&apos;re confident it&apos;s fixed.
        </p>
      </header>

      {loadingInitial ? (
        <p className="text-muted-foreground">Loading mistakes…</p>
      ) : error ? (
        <div className="rounded-ds-xl border border-danger/40 bg-danger/10 p-4 text-danger">
          We couldn&apos;t load your mistakes right now. Please refresh.
        </div>
      ) : mistakes.length === 0 ? (
        <EmptyState
          title="You&apos;re all caught up"
          description="Incorrect answers from practice will appear here for review."
          actionLabel="Start a mock test"
          onAction={() => window.open('/mock-tests', '_self')}
        />
      ) : (
        <div className="space-y-4">
          {mistakes.map((mistake) => (
            <MistakeCard
              key={mistake.id}
              mistake={mistake}
              onReview={handleReview}
              onResolve={handleResolve}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="soft"
                tone="default"
                onClick={() => setSize((prev) => prev + 1)}
                loading={loadingMore}
                loadingText="Loading more"
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

function mapToMistake(prev: MistakeRecord, next: MistakeRecord): MistakeRecord {
  return {
    ...prev,
    ...next,
  };
}
