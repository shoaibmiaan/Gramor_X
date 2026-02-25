'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type AnswerValue = string | number | boolean | string[] | null;

export function useReadingAnswers(slug: string) {
  const storageKey = useMemo(() => `reading:${slug}:answers`, [slug]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const merged: Record<string, AnswerValue> = {};
      // Try multiple legacy keys for migration
      const legacyKeys = [storageKey, `reading:${slug}`, `readingAnswers:${slug}`];
      legacyKeys.forEach((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.assign(merged, parsed as Record<string, AnswerValue>);
          }
        } catch {
          // ignore malformed
        }
      });

      setAnswers(merged);

      // Save merged to the new key and remove old ones
      if (Object.keys(merged).length) {
        localStorage.setItem(storageKey, JSON.stringify(merged));
      }
      legacyKeys
        .filter((key) => key !== storageKey)
        .forEach((key) => {
          localStorage.removeItem(key);
        });
    } catch {
      // ignore
    }
  }, [slug, storageKey]);

  const persist = useCallback(
    (next: Record<string, AnswerValue> | ((prev: Record<string, AnswerValue>) => Record<string, AnswerValue>)) => {
      setAnswers((prev) => {
        const computed = typeof next === 'function' ? next(prev) : next;
        try {
          if (Object.keys(computed).length) {
            localStorage.setItem(storageKey, JSON.stringify(computed));
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch {}
        return computed;
      });
    },
    [storageKey]
  );

  const setAnswer = useCallback(
    (id: string, value: AnswerValue) => {
      persist((prev) => ({ ...prev, [id]: value }));
    },
    [persist]
  );

  const clear = useCallback(() => {
    persist({});
  }, [persist]);

  const allAnswers = useCallback(() => answers, [answers]);

  return { answers, setAnswer, clear, allAnswers };
}

export type ReadingAnswersStore = ReturnType<typeof useReadingAnswers>;