import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWRInfinite from 'swr/infinite';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

import {
  SAVED_PAGE_SIZE,
  HttpError,
  fetchSavedPage,
  deriveModule,
  buildSavedLink,
  removeSavedItem,
  type SavedItem,
  MODULE_LABELS,
} from '@/lib/saved';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

type DecoratedItem = SavedItem & {
  moduleId: string;
  moduleLabel: string;
  href: string;
  createdDate: Date;
};

const keyFor = (item: SavedItem) => `${item.category || 'default'}:${item.type || 'all'}:${item.resource_id}`;

type Filters = {
  search: string;
  module: string;
  start: string;
  end: string;
};

const controlledQueryKeys = ['search', 'module', 'start', 'end'] as const;

const MODULE_OPTIONS = [{ value: 'all', label: 'All modules' }].concat(
  Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label })),
);

export function SavedList() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ search: '', module: 'all', start: '', end: '' });
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [searchInput, setSearchInput] = useState('');

  const syncFiltersFromQuery = useCallback(() => {
    if (!router.isReady) return;
    const next: Filters = {
      search: typeof router.query.search === 'string' ? router.query.search : '',
      module: typeof router.query.module === 'string' ? router.query.module : 'all',
      start: typeof router.query.start === 'string' ? router.query.start : '',
      end: typeof router.query.end === 'string' ? router.query.end : '',
    };
    setFilters((prev) => {
      if (
        prev.search === next.search &&
        prev.module === next.module &&
        prev.start === next.start &&
        prev.end === next.end
      ) {
        return prev;
      }
      return next;
    });
    setSearchInput(next.search);
  }, [router.isReady, router.query.end, router.query.module, router.query.search, router.query.start]);

  useEffect(() => {
    syncFiltersFromQuery();
  }, [syncFiltersFromQuery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('saved-tags');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, string[]>;
        setTags(parsed);
      }
    } catch {
      // ignore parse errors
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'saved-tags') {
        try {
          const parsed = event.newValue ? (JSON.parse(event.newValue) as Record<string, string[]>) : {};
          setTags(parsed);
        } catch {
          setTags({});
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const replaceQuery = useCallback(
    (next: Filters) => {
      if (!router.isReady) return;
      const params = new URLSearchParams();
      if (next.search.trim()) params.set('search', next.search.trim());
      if (next.module && next.module !== 'all') params.set('module', next.module);
      if (next.start) params.set('start', next.start);
      if (next.end) params.set('end', next.end);

      const current = new URLSearchParams();
      for (const key of controlledQueryKeys) {
        const value = router.query[key];
        if (typeof value === 'string') current.set(key, value);
      }

      if (current.toString() === params.toString()) return;

      const queryObject = Object.fromEntries(params.entries()) as Record<string, string>;
      void router.replace(
        {
          pathname: router.pathname,
          query: queryObject,
        },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  const handleFilterChange = useCallback(
    (updates: Partial<Filters>) => {
      setFilters((prev) => {
        const next = { ...prev, ...updates };
        replaceQuery(next);
        return next;
      });
    },
    [replaceQuery],
  );

  const activeFilters = useMemo(() => filters, [filters]);

  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(
    (pageIndex, previousPage) => {
      if (previousPage && !previousPage.hasMore) return null;
      const params = new URLSearchParams();
      params.set('limit', String(SAVED_PAGE_SIZE));
      if (activeFilters.search.trim()) params.set('search', activeFilters.search.trim());
      if (activeFilters.module && activeFilters.module !== 'all') params.set('module', activeFilters.module);
      if (activeFilters.start) params.set('start', activeFilters.start);
      if (activeFilters.end) params.set('end', activeFilters.end);

      if (pageIndex === 0) {
        return `/api/saved?${params.toString()}`;
      }
      const cursor = previousPage?.nextCursor;
      if (!cursor) return null;
      params.set('cursor', cursor);
      return `/api/saved?${params.toString()}`;
    },
    fetchSavedPage,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    setSize(1);
  }, [activeFilters.search, activeFilters.module, activeFilters.start, activeFilters.end, setSize]);

  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const isInitialLoading = !data && !error;
  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);

  const decorated = useMemo<DecoratedItem[]>(
    () =>
      allItems.map((item) => {
        const module = deriveModule(item);
        return {
          ...item,
          moduleId: module.id,
          moduleLabel: module.label,
          href: buildSavedLink(item),
          createdDate: new Date(item.created_at),
        };
      }),
    [allItems],
  );

  const filtered = useMemo(() => {
    const searchTerm = activeFilters.search.trim().toLowerCase();
    const startDate = activeFilters.start ? new Date(activeFilters.start) : null;
    const endDate = activeFilters.end ? new Date(activeFilters.end) : null;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    return decorated.filter((item) => {
      if (activeFilters.module !== 'all' && item.moduleId !== activeFilters.module) return false;
      if (startDate && item.createdDate < startDate) return false;
      if (endDate && item.createdDate > endDate) return false;

      if (!searchTerm) return true;
      const key = keyFor(item);
      const itemTags = tags[key] ?? [];
      const matchesTitle = item.resource_id.toLowerCase().includes(searchTerm);
      const matchesTags = itemTags.some((tag) => tag.toLowerCase().includes(searchTerm));
      return matchesTitle || matchesTags;
    });
  }, [activeFilters, decorated, tags]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: DecoratedItem[] }>();
    for (const item of filtered) {
      const current = map.get(item.moduleId);
      if (current) {
        current.items.push(item);
      } else {
        map.set(item.moduleId, { label: item.moduleLabel, items: [item] });
      }
    }
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [filtered]);

  const hasMore = pages.length > 0 ? pages[pages.length - 1].hasMore : false;
  const loadingMore = isValidating && pages.length > 0;
  const empty = !isInitialLoading && filtered.length === 0;

  const handleRemove = useCallback(
    async (item: DecoratedItem) => {
      const key = keyFor(item);
      setRemovingKey(key);
      await mutate((current) => {
        if (!current) return current;
        return current.map((page) => ({
          ...page,
          items: page.items.filter((candidate) => keyFor(candidate) !== key),
        }));
      }, { revalidate: false });

      try {
        await removeSavedItem(item);
        await mutate();
      } finally {
        setRemovingKey((prev) => (prev === key ? null : prev));
      }
    },
    [mutate],
  );

  if (error instanceof HttpError && error.status === 401) {
    return (
      <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-h4 font-slab">Sign in to view saved items</h2>
            <p className="text-small text-mutedText">
              Bookmarks sync with your account so you can return to them anytime.
            </p>
          </div>
          <Button href="/login" className="rounded-ds-xl">
            Sign in
          </Button>
        </div>
      </Card>
    );
  }

  if (error instanceof HttpError) {
    return (
      <Alert variant="error" className="rounded-ds-2xl" role="alert">
        {error.info && typeof error.info === 'object' && 'error' in (error.info as Record<string, unknown>)
          ? String((error.info as Record<string, unknown>).error)
          : 'We couldn’t load your saved items right now. Please refresh and try again.'}
      </Alert>
    );
  }

  if (error && !(error instanceof HttpError)) {
    return (
      <Alert variant="error" className="rounded-ds-2xl" role="alert">
        Something went wrong while loading your saved items. Please try again.
      </Alert>
    );
  }

  if (isInitialLoading) {
    return (
      <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
        <div className="grid gap-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="animate-pulse space-y-2">
              <div className="h-5 w-40 rounded bg-muted/60" />
              <div className="h-4 w-full rounded bg-muted/40" />
              <div className="h-4 w-1/2 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
        <h2 className="text-h4 font-slab">You haven’t saved anything yet</h2>
        <p className="mt-2 text-small text-mutedText">
          Bookmark practice passages, vocab lists, and AI feedback to revisit them faster.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/reading" variant="secondary" className="rounded-ds-xl">
            Browse reading practice
          </Button>
          <Button href="/vocabulary" variant="ghost" className="rounded-ds-xl">
            Explore vocabulary decks
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
        <form className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] md:items-end" onSubmit={(event) => event.preventDefault()}>
          <Input
            label="Search saved items"
            placeholder="Search by title or tag"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              handleFilterChange({ search: value });
            }}
            size="md"
            className="rounded-ds-xl"
          />
          <Select
            label="Module"
            value={activeFilters.module}
            onChange={(event) => handleFilterChange({ module: event.target.value })}
            options={MODULE_OPTIONS}
          />
          <Input
            label="Saved after"
            type="date"
            value={activeFilters.start}
            onChange={(event) => handleFilterChange({ start: event.target.value })}
          />
          <Input
            label="Saved before"
            type="date"
            value={activeFilters.end}
            onChange={(event) => handleFilterChange({ end: event.target.value })}
          />
        </form>
      </Card>

      {grouped.map((group) => (
        <Card key={group.id} className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <h2 className="text-h4 font-slab">{group.label}</h2>
              <p className="text-small text-mutedText">{group.items.length} saved item{group.items.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {group.items.map((item) => {
              const key = keyFor(item);
              const categoryLabel = (item.category ?? '').replace(/_/g, ' ') || 'Bookmark';
              return (
                <div key={key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={item.href} className="font-medium text-foreground hover:text-primary">
                      {item.resource_id}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-mutedText">
                      <Badge variant="neutral" className="uppercase tracking-[0.18em]">
                        {categoryLabel}
                      </Badge>
                      <span aria-hidden="true">•</span>
                      <span>Saved {formatter.format(item.createdDate)}</span>
                      {(tags[key] ?? []).length > 0 && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="flex flex-wrap gap-1" aria-label="Tags">
                            {(tags[key] ?? []).map((tag) => (
                              <Badge key={tag} variant="outline" className="border-primary/40 text-primary">
                                {tag}
                              </Badge>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button href={item.href} variant="ghost" className="rounded-ds-xl">
                      Open
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-ds-xl"
                      onClick={() => handleRemove(item)}
                      loading={removingKey === key}
                      loadingText="Removing"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            className="rounded-ds-xl"
            onClick={() => setSize(size + 1)}
            loading={loadingMore}
            loadingText="Loading"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default SavedList;
