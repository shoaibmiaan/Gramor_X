import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import useSWRInfinite from 'swr/infinite';

import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Alert } from '@/components/design-system/Alert';

import {
  SAVED_PAGE_SIZE,
  HttpError,
  fetchSavedPage,
  deriveModule,
  buildSavedLink,
  removeSavedItem,
  type SavedItem,
} from '@/lib/saved';
import { useLocale } from '@/lib/locale';

type DecoratedItem = SavedItem & {
  moduleId: string;
  moduleLabelKey: string;
  moduleLabelFallback: string;
  href: string;
  createdDate: Date;
};

const keyFor = (item: SavedItem) => `${item.category || 'default'}:${item.type || 'all'}:${item.resource_id}`;

export function SavedList() {
  const { t, isRTL, locale } = useLocale();
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

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'medium' }),
    [locale],
  );

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
          moduleLabelKey: module.labelKey,
          moduleLabelFallback: module.fallback,
          href: buildSavedLink(item),
          createdDate: new Date(item.created_at),
        };
      }),
    [allItems],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { labelKey: string; labelFallback: string; items: DecoratedItem[] }>();
    for (const item of decorated) {
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
  }, [decorated]);

  const hasMore = pages.length > 0 ? pages[pages.length - 1].hasMore : false;
  const loadingMore = isValidating && pages.length > 0;
  const empty = !isInitialLoading && decorated.length === 0;

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
            <h2 className="text-h4 font-slab">{t('saved.authRequired.title')}</h2>
            <p className="text-small text-mutedText">{t('saved.authRequired.description')}</p>
          </div>
          <Button href="/login" className="rounded-ds-xl">
            {t('saved.actions.signIn')}
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
          : t('saved.errors.loadFailed')}
      </Alert>
    );
  }

  if (error && !(error instanceof HttpError)) {
    return (
      <Alert variant="error" className="rounded-ds-2xl" role="alert">
        {t('saved.errors.generic')}
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
        <h2 className="text-h4 font-slab">{t('saved.empty.title')}</h2>
        <p className="mt-2 text-small text-mutedText">{t('saved.empty.description')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/reading" variant="secondary" className="rounded-ds-xl">
            {t('saved.empty.cta.reading')}
          </Button>
          <Button href="/vocabulary" variant="ghost" className="rounded-ds-xl">
            {t('saved.empty.cta.vocabulary')}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {grouped.map((group) => (
        <Card key={group.id} className="rounded-ds-2xl border border-border/60 bg-card/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <h2 className="text-h4 font-slab">{t(group.labelKey, group.labelFallback)}</h2>
              <p className="text-small text-mutedText">{t('saved.group.count', { count: group.items.length })}</p>
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
                        className={clsx('tracking-[0.18em]', !isRTL && 'uppercase')}
                      >
                        {categoryLabel}
                      </Badge>
                      <span aria-hidden="true">•</span>
                      <span>{t('saved.item.savedOn', { date: dateFormatter.format(item.createdDate) })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button href={item.href} variant="ghost" className="rounded-ds-xl">
                      {t('saved.actions.open')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-ds-xl"
                      onClick={() => handleRemove(item)}
                      loading={removingKey === key}
                      loadingText={t('saved.actions.removing')}
                    >
                      {t('saved.actions.remove')}
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
            loadingText={t('saved.actions.loading')}
          >
            {t('saved.actions.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SavedList;
