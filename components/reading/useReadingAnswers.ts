'use client';
import { useEffect, useMemo, useState } from 'react';

/**
 * Minimal client store for Reading answers (per passage).
 * - Persists to localStorage under key `reading:<slug>`
 * - API: getAnswer, setAnswer, clear, allAnswers
 */
export type AnswerValue = string | number | boolean | string[] | null;

export function useReadingAnswers(slug: string) {
  const key = useMemo(() => `reading:${slug}`, [slug]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
  }, [key]);

  const persist = (next: Record<string, AnswerValue>) => {
    setAnswers(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };

  const getAnswer = (id: string): AnswerValue => answers[id] ?? null;
  const setAnswer = (id: string, value: AnswerValue) =>
    persist({ ...answers, [id]: value });
  const clear = () => persist({});
  const allAnswers = () => answers;

  return { answers, getAnswer, setAnswer, clear, allAnswers };
}
