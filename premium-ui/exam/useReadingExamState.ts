'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

type AnswerMap = Record<string, string>;

type Snapshot = {
  slug: string;
  version: number;
  answers: AnswerMap;
  currentQuestion: number;
  passageIndex: number;
  secondsRemaining: number | null;
};

type PersistedSnapshot = {
  snapshot: Snapshot;
  savedAt: string;
};

type Options = {
  slug: string;
  initialQuestion?: number;
  initialPassageIndex?: number;
  initialSeconds?: number | null;
};

type UseReadingExamStateResult = {
  attemptId: string;
  hydrated: boolean;
  answers: AnswerMap;
  currentQuestion: number;
  passageIndex: number;
  secondsRemaining: number | null;
  setAnswer: (questionId: string, value: string) => void;
  setCurrentQuestion: (questionNo: number) => void;
  setPassageIndex: (index: number) => void;
  setSecondsRemaining: (value: number | null | ((prev: number | null) => number | null)) => void;
  flush: () => void;
  clear: () => void;
};

const SNAPSHOT_VERSION = 1;

const isBrowser = typeof window !== 'undefined';

const getNowIso = () => new Date().toISOString();

export const safeParse = (raw: string | null): PersistedSnapshot | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.snapshot || typeof parsed.snapshot !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const hasProgress = (snapshot: Snapshot) => {
  if (Object.keys(snapshot.answers).length > 0) return true;
  if (snapshot.currentQuestion > 1) return true;
  if (snapshot.passageIndex > 0) return true;
  if (typeof snapshot.secondsRemaining === 'number') return true;
  return false;
};

export const ensureAttemptId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `reading-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export async function persistSnapshotOnce({
  storage,
  storageKey,
  attemptId,
  slug,
  payload,
  fetcher,
}: {
  storage: Pick<Storage, 'setItem'> | null;
  storageKey: string;
  attemptId: string;
  slug: string;
  payload: PersistedSnapshot;
  fetcher: typeof fetch;
}) {
  if (storage) {
    try {
      storage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  }

  if (!attemptId) return;

  try {
    await fetcher(`/api/exam/${encodeURIComponent(attemptId)}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reading_autosave',
        payload: { ...payload, slug },
        occurredAt: payload.savedAt,
      }),
    });
  } catch {
    // ignore network errors
  }
}

export function useReadingExamState(options: Options): UseReadingExamStateResult {
  const { slug, initialQuestion = 1, initialPassageIndex = 0, initialSeconds = null } = options;
  const attemptStorageKey = useMemo(() => `premium:reading:${slug}:attempt`, [slug]);
  const snapshotStorageKey = useMemo(() => `premium:reading:${slug}:snapshot`, [slug]);

  const defaultSnapshot = useMemo<Snapshot>(
    () => ({
      slug,
      version: SNAPSHOT_VERSION,
      answers: {},
      currentQuestion: initialQuestion,
      passageIndex: initialPassageIndex,
      secondsRemaining: initialSeconds ?? null,
    }),
    [slug, initialQuestion, initialPassageIndex, initialSeconds],
  );

  const [attemptId, setAttemptId] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot>(defaultSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const savedAtRef = useRef<string>('');
  const hydrationPendingRef = useRef(true);

  const resolveAttemptId = useCallback(() => {
    if (!isBrowser) return '';
    try {
      const existing = window.localStorage.getItem(attemptStorageKey);
      if (existing) return existing;
      const fresh = ensureAttemptId();
      window.localStorage.setItem(attemptStorageKey, fresh);
      return fresh;
    } catch {
      return ensureAttemptId();
    }
  }, [attemptStorageKey]);

  // Attempt ID bootstrap
  useEffect(() => {
    if (!slug) return;
    setAttemptId(resolveAttemptId());
  }, [slug, resolveAttemptId]);

  // Local snapshot hydration
  useEffect(() => {
    if (!isBrowser) return;
    const local = safeParse(window.localStorage.getItem(snapshotStorageKey));
    if (local && local.snapshot?.slug === slug && local.snapshot?.version === SNAPSHOT_VERSION) {
      setSnapshot((prev) => ({ ...prev, ...local.snapshot, slug, version: SNAPSHOT_VERSION }));
      savedAtRef.current = local.savedAt;
    } else {
      savedAtRef.current = '';
    }
  }, [slug, snapshotStorageKey]);

  // Remote hydration
  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/exam/${encodeURIComponent(attemptId)}/event?type=reading_autosave&limit=1`,
        );
        if (!res.ok) throw new Error('Failed to load snapshot');
        const json = (await res.json()) as {
          ok: boolean;
          events?: {
            payload?: {
              slug?: string;
              snapshot?: Snapshot;
              savedAt?: string;
            } | null;
          }[];
        };
        const latest = json?.events?.[0]?.payload;
        if (cancelled || !latest) {
          return;
        }
        if (latest.slug && latest.slug !== slug) {
          return;
        }
        const savedAt = latest.savedAt ?? '';
        const shouldHydrate = !savedAtRef.current || savedAt > savedAtRef.current;
        if (shouldHydrate && latest.snapshot) {
          setSnapshot((prev) => ({
            ...prev,
            ...latest.snapshot,
            slug,
            version: SNAPSHOT_VERSION,
          }));
          savedAtRef.current = savedAt;
        }
      } catch {
        // ignore network failures
      } finally {
        if (!cancelled) {
          hydrationPendingRef.current = false;
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, slug]);

  useEffect(() => {
    if (!hydrationPendingRef.current && !hydrated) {
      setHydrated(true);
    }
  }, [hydrated]);

  const persistSnapshot = useDebouncedCallback((payload: PersistedSnapshot, targetAttemptId: string) => {
    if (!targetAttemptId) return;
    void persistSnapshotOnce({
      storage: isBrowser ? window.localStorage : null,
      storageKey: snapshotStorageKey,
      attemptId: targetAttemptId,
      slug,
      payload,
      fetcher: fetch,
    });
  }, 800, { maxWait: 3000 });

  useEffect(() => {
    if (!attemptId || !hydrated) return;
    if (!hasProgress(snapshot)) return;
    const persisted: PersistedSnapshot = { snapshot: { ...snapshot, slug }, savedAt: getNowIso() };
    savedAtRef.current = persisted.savedAt;
    persistSnapshot(persisted, attemptId);
    return () => {
      persistSnapshot.flush();
    };
  }, [snapshot, attemptId, hydrated, persistSnapshot, slug]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setSnapshot((prev) => {
      const nextAnswers: AnswerMap = { ...prev.answers };
      if (value == null || value === '') {
        if (!(questionId in nextAnswers)) return prev;
        delete nextAnswers[questionId];
      } else if (nextAnswers[questionId] === value) {
        return prev;
      } else {
        nextAnswers[questionId] = value;
      }
      return { ...prev, answers: nextAnswers };
    });
  }, []);

  const setCurrentQuestion = useCallback((questionNo: number) => {
    setSnapshot((prev) => (prev.currentQuestion === questionNo ? prev : { ...prev, currentQuestion: questionNo }));
  }, []);

  const setPassageIndex = useCallback((index: number) => {
    setSnapshot((prev) => (prev.passageIndex === index ? prev : { ...prev, passageIndex: index }));
  }, []);

  const setSecondsRemaining = useCallback(
    (value: number | null | ((prev: number | null) => number | null)) => {
      setSnapshot((prev) => {
        const nextValue = typeof value === 'function' ? (value as (prev: number | null) => number | null)(prev.secondsRemaining) : value;
        const normalized = typeof nextValue === 'number' && Number.isFinite(nextValue)
          ? Math.max(0, Math.round(nextValue))
          : nextValue === null
          ? null
          : prev.secondsRemaining;
        if (normalized === prev.secondsRemaining) return prev;
        return { ...prev, secondsRemaining: normalized };
      });
    },
    [],
  );

  const flush = useCallback(() => {
    persistSnapshot.flush();
  }, [persistSnapshot]);

  const clear = useCallback(() => {
    persistSnapshot.cancel();
    savedAtRef.current = '';
    if (isBrowser) {
      try {
        window.localStorage.removeItem(snapshotStorageKey);
        window.localStorage.removeItem(attemptStorageKey);
      } catch {
        // ignore
      }
    }
    setSnapshot(defaultSnapshot);
    setAttemptId(resolveAttemptId());
  }, [persistSnapshot, snapshotStorageKey, attemptStorageKey, defaultSnapshot, resolveAttemptId]);

  useEffect(() => {
    if (!isBrowser) return;
    const handle = () => {
      persistSnapshot.flush();
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [persistSnapshot]);

  return {
    attemptId,
    hydrated,
    answers: snapshot.answers,
    currentQuestion: snapshot.currentQuestion,
    passageIndex: snapshot.passageIndex,
    secondsRemaining: snapshot.secondsRemaining ?? null,
    setAnswer,
    setCurrentQuestion,
    setPassageIndex,
    setSecondsRemaining,
    flush,
    clear,
  };
}
