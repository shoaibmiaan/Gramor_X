import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { Select } from '@/components/design-system/Select';

import {
  SAVED_PAGE_SIZE,
  HttpError,
  fetchSavedPage,
  deriveModule,
  buildSavedLink,
  removeSavedItem,
  removeSavedItems,
  type SavedItem,
} from '@/lib/saved';
import { track } from '@/lib/analytics/track';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

type DecoratedItem = SavedItem & {
  moduleId: string;
  moduleLabel: string;
  href: string;
  createdDate: Date;
};

const keyFor = (item: SavedItem) => `${item.category || 'default'}:${item.type || 'all'}:${item.resource_id}`;

const DATE_FILTER_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

type DateFilterValue = (typeof DATE_FILTER_OPTIONS)[number]['value'];

export function SavedList() {
  const { data, error, isValidating, size, setSize, mutate } = useSWRInfinite(
    (pageIndex, previousPage) => {
      if (previousPage && !previousPage.hasMore) return null;
      if (pageIndex === 0) return `/api/saved?limit=${SAVED_PAGE_SIZE}`;
      const cursor = previousPage?.nextCursor;
      if (!cursor) return null;
      return `/api/saved?limit=${SAVED_PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`;
    },
    fetchSavedPage,
    { revalidateOnFocus: false },
  );

  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('any');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);
  const viewTracked = useRef(false);

  const isInitialLoading = !data && !error;
  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);

  const decorated = useMemo<DecoratedItem[]>(
    () =>
      allItems.map((item) => {
        const moduleMeta = deriveModule(item);
        return {
          ...item,
          moduleId: moduleMeta.id,
          moduleLabel: moduleMeta.label,
          href: buildSavedLink(item),
          createdDate: new Date(item.created_at),
        };
      }),
    [allItems],
  );

  const moduleOptions = useMemo(
    () => {
      const modules = new Map<string, string>();
      for (const item of decorated) {
        modules.set(item.moduleId, item.moduleLabel);
      }
      const dynamicOptions = Array.from(modules.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label }));
      return [{ value: 'all', label: 'All modules' }, ...dynamicOptions];
    },
    [decorated],
  );

  const filteredItems = useMemo(() => {
    let cutoff: Date | null = null;
    if (dateFilter !== 'any') {
      const days = Number.parseInt(dateFilter, 10);
      if (!Number.isNaN(days)) {
        cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - days);
      }
    }

    return decorated.filter((item) => {
      if (moduleFilter !== 'all' && item.moduleId !== moduleFilter) {
        return false;
      }
      if (!cutoff) return true;
      return item.createdDate >= cutoff;
    });
  }, [decorated, moduleFilter, dateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: DecoratedItem[] }>();
    for (const item of filteredItems) {
      const current = map.get(item.moduleId);
      if (current) {
        current.items.push(item);
      } else {
        map.set(item.moduleId, { label: item.moduleLabel, items: [item] });
      }
    }
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [filteredItems]);

  const hasMore = pages.length > 0 ? pages[pages.length - 1].hasMore : false;
  const loadingMore = isValidating && pages.length > 0;
  const empty = !isInitialLoading && decorated.length === 0;
  const filteredEmpty = !isInitialLoading && decorated.length > 0 && filteredItems.length === 0;
  const hasFilters = moduleFilter !== 'all' || dateFilter !== 'any';
  const selectedCount = selected.size;
  const allSelected = filteredItems.length > 0 && selectedCount === filteredItems.length;
  const hasSelection = selectedCount > 0;

  useEffect(() => {
    if (viewTracked.current || isInitialLoading) return;
    track('saved_view', { total: decorated.length });
    viewTracked.current = true;
  }, [decorated.length, isInitialLoading]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visibleKeys = new Set(filteredItems.map((item) => keyFor(item)));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((key) => {
        if (visibleKeys.has(key)) {
          next.add(key);
        } else {
          changed = true;
        }
      });
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
  }, [filteredItems]);

  const removeOptimistically = useCallback(
    (keys: Set<string>) =>
      mutate((current) => {
        if (!current) return current;
        return current.map((page) => ({
          ...page,
          items: page.items.filter((candidate) => !keys.has(keyFor(candidate))),
        }));
      }, { revalidate: false }),
    [mutate],
  );

  useEffect(() => {
    if (isInitialLoading) return;
    const prev = previousCountRef.current;
    const next = decorated.length;
    if (prev === next) return;
    previousCountRef.current = next;
    void emitUserEvent('saved_view', { step: next, delta: next - prev });
  }, [decorated.length, isInitialLoading]);

  const handleRemove = useCallback(
    async (item: DecoratedItem) => {
      const key = keyFor(item);
      setRemovingKey(key);
      const keys = new Set<string>([key]);
      await removeOptimistically(keys);
      setSelected((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      try {
        await removeSavedItem(item);
        track('saved_remove', {
          count: 1,
          module: item.moduleId,
          category: item.category ?? undefined,
        });
      } catch (removeError) {
        console.error('Failed to remove saved item', removeError);
      } finally {
        await mutate();
        setRemovingKey((prev) => (prev === key ? null : prev));
      }
    },
    [mutate, removeOptimistically],
  );

  const handleBulkRemove = useCallback(async () => {
    if (selected.size === 0) return;
    const itemsToRemove = filteredItems.filter((item) => selected.has(keyFor(item)));
    if (itemsToRemove.length === 0) return;

    const keys = new Set(itemsToRemove.map((item) => keyFor(item)));
    setIsBulkRemoving(true);
    await removeOptimistically(keys);
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      keys.forEach((key) => next.delete(key));
      return next;
    });

    try {
      await removeSavedItems(itemsToRemove);
      const modules = Array.from(new Set(itemsToRemove.map((item) => item.moduleId)));
      track('saved_remove', {
        count: itemsToRemove.length,
        modules: modules.join(','),
      });
    } catch (removeError) {
      console.error('Failed to remove saved items', removeError);
    } finally {
      await mutate();
      setIsBulkRemoving(false);
    }
  }, [filteredItems, mutate, removeOptimistically, selected]);

  const toggleSelectAll = useCallback(() => {
    if (filteredItems.length === 0) return;
    setSelected((prev) => {
      if (prev.size === filteredItems.length) {
        return new Set();
      }
      return new Set(filteredItems.map((item) => keyFor(item)));
    });
  }, [filteredItems]);

  const handleClearFilters = useCallback(() => {
    setModuleFilter('all');
    setDateFilter('any');
  }, []);

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
      <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end sm:gap-4">
            <Select
              label="Module"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              options={moduleOptions}
              className="sm:w-56"
            />
            <Select
              label="Date saved"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilterValue)}
              options={DATE_FILTER_OPTIONS}
              className="sm:w-56"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                className="rounded-ds-xl"
                onClick={handleClearFilters}
                disabled={isBulkRemoving}
              >
                Reset filters
              </Button>
            )}
            {hasSelection && (
              <span className="text-small text-mutedText">{selectedCount} selected</span>
            )}
            <Button
              type="button"
              variant="soft"
              tone="default"
              className="rounded-ds-xl"
              onClick={toggleSelectAll}
              disabled={filteredItems.length === 0 || isBulkRemoving}
            >
              {allSelected ? 'Clear selection' : 'Select all'}
            </Button>
            {hasSelection && (
              <Button
                type="button"
                variant="soft"
                tone="danger"
                className="rounded-ds-xl"
                onClick={handleBulkRemove}
                loading={isBulkRemoving}
                loadingText="Removing"
              >
                Remove selected ({selectedCount})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {filteredEmpty ? (
        <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
          <h2 className="text-h4 font-slab">No saved items match your filters</h2>
          <p className="mt-2 text-small text-mutedText">
            Try selecting a different module or date range to see your bookmarks.
          </p>
          {hasFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                className="rounded-ds-xl"
                onClick={handleClearFilters}
                disabled={isBulkRemoving}
              >
                Clear filters
              </Button>
            </div>
          )}
        </Card>
      ) : (
        grouped.map((group) => (
          <Card key={group.id} className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div>
                <h2 className="text-h4 font-slab">{group.label}</h2>
                <p className="text-small text-mutedText">
                  {group.items.length} saved item{group.items.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {group.items.map((item) => {
                const key = keyFor(item);
                const categoryLabel = (item.category ?? '').replace(/_/g, ' ') || 'Bookmark';
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0 rounded border border-border bg-card text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Select ${item.resource_id}`}
                        checked={selected.has(key)}
                        onChange={() => setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) {
                            next.delete(key);
                          } else {
                            next.add(key);
                          }
                          return next;
                        })}
                        disabled={isBulkRemoving || removingKey === key}
                      />
                      <div>
                        <Link
                          href={item.href}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {item.resource_id}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-mutedText">
                          <Badge variant="neutral" className="uppercase tracking-[0.18em]">
                            {categoryLabel}
                          </Badge>
                          <span aria-hidden="true">•</span>
                          <span>Saved {formatter.format(item.createdDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        href={item.href}
                        variant="ghost"
                        className="rounded-ds-xl"
                        disabled={isBulkRemoving}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-ds-xl"
                        onClick={() => handleRemove(item)}
                        loading={removingKey === key}
                        loadingText="Removing"
                        disabled={isBulkRemoving}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

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
