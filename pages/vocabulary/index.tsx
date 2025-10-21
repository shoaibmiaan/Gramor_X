import Head from 'next/head';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Loader2 } from 'lucide-react';

import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { EmptyState } from '@/components/design-system/EmptyState';
import { Heading } from '@/components/design-system/Heading';
import { Filters } from '@/components/vocab/Filters';
import { WordCard } from '@/components/vocab/WordCard';
import { apiFetch, createQueryString } from '@/lib/db/api';
import { useInfiniteQuery } from '@/lib/hooks/useInfiniteQuery';
import type { PaginatedVocabularyResponse, WordSummary } from '@/types/vocabulary';

const PAGE_SIZE = 24;

const PART_OF_SPEECH_OPTIONS = [
  { value: 'all', label: 'All parts of speech' },
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'phrase', label: 'Phrase' },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All levels' },
  { value: 'A1', label: 'A1 Beginner' },
  { value: 'A2', label: 'A2 Elementary' },
  { value: 'B1', label: 'B1 Intermediate' },
  { value: 'B2', label: 'B2 Upper-intermediate' },
  { value: 'C1', label: 'C1 Advanced' },
  { value: 'C2', label: 'C2 Mastery' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'academic', label: 'Academic' },
  { value: 'business', label: 'Business' },
  { value: 'daily-life', label: 'Daily life' },
  { value: 'technology', label: 'Technology' },
  { value: 'travel', label: 'Travel' },
];

const DEFAULT_FILTERS = {
  search: '',
  partOfSpeech: 'all',
  level: 'all',
  category: 'all',
};

type FiltersState = typeof DEFAULT_FILTERS;

export default function VocabularyBrowser() {
  const [filters, setFilters] = React.useState<FiltersState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = React.useState('');
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, 300);

  const filtersKey = React.useMemo(() => JSON.stringify(filters), [filters]);

  const fetchPage = React.useCallback(
    async ({ cursor, signal }: { cursor: string | null; signal?: AbortSignal }) => {
      const query = createQueryString({
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pos: filters.partOfSpeech !== 'all' ? filters.partOfSpeech : undefined,
        level: filters.level !== 'all' ? filters.level : undefined,
        category: filters.category !== 'all' ? filters.category : undefined,
      });

      const response = await apiFetch<PaginatedVocabularyResponse<WordSummary>>(
        `/api/vocabulary${query}`,
        { signal },
      );

      return {
        items: response.items ?? [],
        nextCursor: response.nextCursor ?? null,
        total: response.total ?? null,
      };
    },
    [filters],
  );

  const { items, loadMore, hasMore, isLoading, isInitialLoading, error, refresh } = useInfiniteQuery<WordSummary>({
    fetchPage,
    deps: [filtersKey],
  });

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.partOfSpeech !== 'all') count += 1;
    if (filters.level !== 'all') count += 1;
    if (filters.category !== 'all') count += 1;
    return count;
  }, [filters.category, filters.level, filters.partOfSpeech]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    debouncedSearch.cancel();
    setFilters((prev) => ({ ...prev, search: '' }));
  };

  const handleFilterChange = (
    key: keyof Omit<FiltersState, 'search'>,
    value: string,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSearchInput('');
    debouncedSearch.cancel();
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <>
      <Head>
        <title>Vocabulary Explorer • Gramor_X</title>
      </Head>

      <main className="bg-background py-16">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Heading as="h1" size="xl">
              Vocabulary Explorer
            </Heading>
            <p className="text-body text-muted-foreground">
              Search, filter, and save vocabulary aligned with the IELTS curriculum.
            </p>
          </div>

          <Card className="space-y-4 p-6">
            <Filters
              searchValue={searchInput}
              values={filters}
              partOfSpeechOptions={PART_OF_SPEECH_OPTIONS}
              levelOptions={LEVEL_OPTIONS}
              categoryOptions={CATEGORY_OPTIONS}
              activeCount={activeFilterCount}
              onSearchChange={handleSearchChange}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              onClearSearch={handleClearSearch}
            />
            {(filters.search || activeFilterCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                <span>Active query:</span>
                {filters.search && <Badge variant="secondary">“{filters.search}”</Badge>}
                {filters.partOfSpeech !== 'all' && <Badge variant="subtle">{filters.partOfSpeech}</Badge>}
                {filters.level !== 'all' && <Badge variant="subtle">Level {filters.level}</Badge>}
                {filters.category !== 'all' && <Badge variant="subtle">{filters.category}</Badge>}
              </div>
            )}
          </Card>

          {error && (
            <Alert variant="error" title="We couldn’t load vocabulary right now." className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{error}</span>
                <Button size="sm" variant="ghost" onClick={refresh}>
                  Try again
                </Button>
              </div>
            </Alert>
          )}

          <section className="space-y-6">
            {isInitialLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden="true" />
                <span className="sr-only">Loading vocabulary…</span>
              </div>
            )}

            {!isInitialLoading && items.length === 0 && !error && (
              <EmptyState
                title="No vocabulary found"
                description="Try adjusting your filters or search for a different keyword."
                actions={
                  <Button variant="ghost" onClick={handleReset}>
                    Reset filters
                  </Button>
                }
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((entry) => (
                <WordCard key={entry.id} entry={entry} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={loadMore}
                  loading={isLoading}
                  loadingText="Loading"
                  className="px-6"
                >
                  Load more
                </Button>
              </div>
            )}

            {isLoading && !isInitialLoading && (
              <div className="flex items-center justify-center py-8 text-small text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Loading more words…
              </div>
            )}

            <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
          </section>
        </Container>
      </main>
    </>
  );
}
