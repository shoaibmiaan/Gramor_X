import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface InfinitePage<T> {
  items: T[];
  nextCursor?: string | null;
  total?: number | null;
}

interface UseInfiniteQueryOptions<T> {
  fetchPage: (params: { cursor: string | null; signal?: AbortSignal }) => Promise<InfinitePage<T>>;
  initialCursor?: string | null;
  enabled?: boolean;
  deps?: ReadonlyArray<unknown>;
}

interface UseInfiniteQueryResult<T> {
  items: T[];
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
  hasMore: boolean;
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  total?: number | null;
}

export function useInfiniteQuery<T>({
  fetchPage,
  initialCursor = null,
  enabled = true,
  deps = [],
}: UseInfiniteQueryOptions<T>): UseInfiniteQueryResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null | undefined>(undefined);

  const cursorRef = useRef<string | null>(initialCursor);
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(
    async (reset: boolean) => {
      if (!enabled) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const cursor = reset ? initialCursor : cursorRef.current;

      setIsLoading(true);
      if (reset) {
        setItems([]);
        setHasMore(true);
        setError(null);
      }

      try {
        const page = await fetchPage({ cursor: cursor ?? null, signal: controller.signal });
        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        cursorRef.current = page.nextCursor ?? null;
        setHasMore(Boolean(page.nextCursor));
        if (page.total !== undefined) {
          setTotal(page.total);
        } else if (reset && page.items) {
          setTotal(undefined);
        }
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const message = (err as Error)?.message ?? 'Unable to load results';
        setError(message);
        setHasMore(false);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsLoading(false);
      }
    },
    [enabled, fetchPage, initialCursor],
  );

  useEffect(() => {
    if (!enabled) return;
    runFetch(true);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, runFetch, ...deps]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading || !enabled) return;
    runFetch(false);
  }, [enabled, hasMore, isLoading, runFetch]);

  const refresh = useCallback(() => {
    runFetch(true);
  }, [runFetch]);

  const reset = useCallback(() => {
    cursorRef.current = initialCursor ?? null;
    runFetch(true);
  }, [initialCursor, runFetch]);

  const isInitialLoading = useMemo(() => isLoading && items.length === 0, [isLoading, items.length]);

  return { items, loadMore, refresh, reset, hasMore, isLoading, isInitialLoading, error, total };
}
