import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useSWRInfinite from 'swr/infinite';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';
import { UpgradeBanner } from '@/components/premium/UpgradeBanner';
import { usePlan } from '@/hooks/usePlan';
import { useLocale } from '@/lib/locale';
import { track } from '@/lib/analytics/track';

import {
  SAVED_PAGE_SIZE,
  HttpError,
  fetchSavedPage,
  deriveModule,
  buildSavedLink,
  removeSavedItem,
  type SavedItem,
} from '@/lib/saved';

type DecoratedItem = SavedItem & {
  moduleId: string;
  moduleLabelKey: string;
  moduleLabelFallback: string;
  href: string;
  createdDate: Date;
};

type Filters = {
  search: string;
  module: string;
  start: string;
  end: string;
};

const controlledQueryKeys = ['search', 'module', 'start', 'end'] as const;

export function SavedList() {
  const router = useRouter();
  const { t, isRTL, locale } = useLocale();

  const [filters, setFilters] = useState<Filters>({ search: '', module: 'all', start: '', end: '' });
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [searchInput, setSearchInput] = useState('');
  const viewTracked = useRef(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

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
      if (stored) setTags(JSON.parse(stored) as Record<string, string[]>);
    } catch {
      // ignore
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'saved-tags') {
        try {
          setTags(event.newValue ? (JSON.parse(event.newValue) as Record<string, string[]>) : {});
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

      void router.replace(
        { pathname: router.pathname, query: Object.fromEntries(params.entries()) as Record<string, string> },
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

      if (pageIndex === 0) return `/api/saved?${params.toString()}`;
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

  const isInitialLoading = !data && !error;
  const pages = data ?? [];
  const allItems = pages.flatMap((page) => page.items);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }),
    [locale],
  );

  const keyFor = (item: SavedItem) => `${item.category || 'default'}:${item.type || 'all'}:${item.resource_id}`;

  const decorated = useMemo<DecoratedItem[]>(
    () =>
      allItems.map((item) => {
        const moduleMeta = deriveModule(item);
        return {
          ...item,
          moduleId: moduleMeta.id,
          moduleLabelKey: moduleMeta.labelKey,
          moduleLabelFallback: moduleMeta.fallback,
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
    if (endDate) endDate.setHours(23, 59, 59, 999);

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
    const map = new Map<string, { labelKey: string; labelFallback: string; items: DecoratedItem[] }>();
    for (const item of filtered) {
      const current = map.get(item.moduleId);
      if (current) {
        current.items.push(item);
      } else {
        map.set(item.moduleId, {
          labelKey: item.moduleLabelKey,
          labelFallback: item.moduleLabelFallback,
          items: [item],
        });
      }
    }
    return Array.from(map.entries()).map(([id, value]) => ({ id, ...value }));
  }, [filtered]);

  const hasMore = pages.length > 0 ? pages[pages.length - 1].hasMore : false;
  const loadingMore = isValidating && pages.length > 0;
  const empty = !isInitialLoading && filtered.length === 0;

  const { plan, loading: planLoading } = usePlan();
  const isUnauthorized = error instanceof HttpError && error.status === 401;
  const showUpgrade = !planLoading && plan === 'free' && !isUnauthorized;
  const upgradeBanner = showUpgrade ? (
    <UpgradeBanner
      pillLabel="Explorer · Free plan"
      title="Keep every bookmark in sync"
      description="Premium unlocks unlimited saved lessons, cross-device sync, and AI-powered recap suggestions."
      href="/pricing?from=saved-upgrade"
      feature="Saved library"
    />
  ) : null;

  const removeOptimistically = useCallback(
    async (keys: Set<string>) => {
      await mutate(
        (pages) =>
          (pages ?? []).map((p) => ({
            ...p,
            items: p.items.filter((it) => !keys.has(keyFor(it))),
          })),
        { revalidate: false },
      );
    },
    [mutate],
  );

  const handleRemove = useCallback(
    async (item: DecoratedItem) => {
      const key = keyFor(item);
      setRemovingKey(key);
      await removeOptimistically(new Set([key]));
      try {
        await removeSavedItem(item);
        track('saved_remove', { count: 1, module: item.moduleId, category: item.category ?? undefined });
      } catch (removeError) {
        console.error('Failed to remove saved item', removeError);
      } finally {
        await mutate();
        setRemovingKey((prev) => (prev === key ? null : prev));
      }
    },
    [mutate, removeOptimistically],
  );

  if (isUnauthorized) {
    return (
      <div className="space-y-6">
        {upgradeBanner}
        <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-h4 font-slab">{t('saved.authRequired.title', 'Sign in to view saved items')}</h2>
              <p className="text-small text-mutedText">
                {t(
                  'saved.authRequired.description',
                  'Bookmarks sync with your account so you can return to them anytime.',
                )}
              </p>
            </div>
            <Button href="/login" className="rounded-ds-xl">
              {t('saved.actions.signIn', 'Sign in')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (error instanceof HttpError) {
    return (
      <div className="space-y-6">
        {upgradeBanner}
        <Alert variant="error" className="rounded-ds-2xl" role="alert">
          {error.info && typeof error.info === 'object' && 'error' in (error.info as Record<string, unknown>)
            ? String((error.info as Record<string, unknown>).error)
            : t('saved.errors.loadFailed', 'We couldn’t load your saved items right now. Please refresh and try again.')}
        </Alert>
      </div>
    );
  }

  if (error && !(error instanceof HttpError)) {
    return (
      <div className="space-y-6">
        {upgradeBanner}
        <Alert variant="error" className="rounded-ds-2xl" role="alert">
          {t('saved.errors.generic', 'Something went wrong while loading your saved items. Please try again.')}
        </Alert>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-6">
        {upgradeBanner}
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
      </div>
    );
  }

  if (empty) {
    return (
      <div className="space-y-6">
        {upgradeBanner}
        <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
          <h2 className="text-h4 font-slab">{t('saved.empty.title', 'You haven’t saved anything yet')}</h2>
          <p className="mt-2 text-small text-mutedText">
            {t(
              'saved.empty.description',
              'Bookmark practice passages, vocab lists, and AI feedback to revisit them faster.',
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href="/reading" variant="secondary" className="rounded-ds-xl">
              {t('saved.empty.cta.reading', 'Browse reading practice')}
            </Button>
            <Button href="/vocabulary" variant="ghost" className="rounded-ds-xl">
              {t('saved.empty.cta.vocabulary', 'Explore vocabulary decks')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {upgradeBanner}
      <div className="grid gap-6">
        {grouped.map((group) => (
          <Card key={group.id} className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
              <div>
                <h2 className="text-h4 font-slab">{t(group.labelKey, group.labelFallback)}</h2>
                <p className="text-small text-mutedText">
                  {t('saved.group.count', '{{count}} saved items', { count: group.items.length })}
                </p>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {group.items.map((item) => {
                const key = keyFor(item);
                const categoryKey = item.category ? `saved.categories.${item.category}` : 'saved.categories.bookmark';
                const fallbackCategory = (item.category ?? '').replace(/_/g, ' ') || 'Bookmark';
                const categoryLabel = t(categoryKey, fallbackCategory);
                return (
                  <div key={key} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link href={item.href} className="font-medium text-foreground hover:text-primary">
                        {item.resource_id}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-mutedText">
                        <Badge
                          variant="neutral"
                          className={isRTL ? undefined : 'uppercase tracking-[0.18em]'}
                        >
                          {categoryLabel}
                        </Badge>
                        <span aria-hidden="true">•</span>
                        <span>
                          {t('saved.item.savedOn', 'Saved {{date}}', { date: dateFormatter.format(item.createdDate) })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button href={item.href} variant="ghost" className="rounded-ds-xl">
                        {t('saved.actions.open', 'Open')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="rounded-ds-xl"
                        onClick={() => handleRemove(item)}
                        loading={removingKey === key}
                        loadingText={t('saved.actions.removing', 'Removing')}
                      >
                        {t('saved.actions.remove', 'Remove')}
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
              loadingText={t('saved.actions.loading', 'Loading')}
            >
              {t('saved.actions.loadMore', 'Load more')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SavedList;
