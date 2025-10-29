// lib/writing/diff.ts
// Utilities to align AI generated error spans with the original essay text.

import type { WritingError } from '@/types/writing';

const clamp = (value: number, lower: number, upper: number) => {
  if (Number.isNaN(value)) return lower;
  if (value < lower) return lower;
  if (value > upper) return upper;
  return value;
};

const normaliseRange = (start: number | undefined, end: number | undefined, length: number) => {
  const safeStart = clamp(typeof start === 'number' ? start : 0, 0, length);
  const safeEnd = clamp(typeof end === 'number' ? end : safeStart, safeStart, length);
  return { start: safeStart, end: safeEnd };
};

const findExcerpt = (essay: string, excerpt: string): { start: number; end: number } | null => {
  if (!excerpt.trim()) return null;
  const index = essay.toLowerCase().indexOf(excerpt.trim().toLowerCase());
  if (index === -1) return null;
  return { start: index, end: index + excerpt.trim().length };
};

export const sanitiseWritingErrors = (essay: string, errors: WritingError[] = []): WritingError[] => {
  if (!essay) return [];
  const length = essay.length;
  const mapped: WritingError[] = [];
  const seenHashes = new Set<string>();

  errors.forEach((error, index) => {
    const excerpt = (error.excerpt ?? '').slice(0, 500);
    const key = `${error.type}-${excerpt}-${index}`;
    if (seenHashes.has(key)) return;
    seenHashes.add(key);

    let start = error.startOffset;
    let end = error.endOffset;
    if (typeof start !== 'number' || typeof end !== 'number' || end <= start) {
      const guess = findExcerpt(essay, excerpt);
      if (guess) {
        start = guess.start;
        end = guess.end;
      }
    }
    const { start: safeStart, end: safeEnd } = normaliseRange(start, end, length);

    mapped.push({
      ...error,
      excerpt,
      startOffset: safeStart,
      endOffset: safeEnd,
    });
  });

  return mergeOverlappingErrors(mapped);
};

export const mergeOverlappingErrors = (errors: WritingError[]): WritingError[] => {
  const sorted = [...errors].sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));
  const merged: WritingError[] = [];

  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push(current);
      continue;
    }

    const lastEnd = last.endOffset ?? 0;
    const currentStart = current.startOffset ?? 0;
    if (currentStart <= lastEnd) {
      const combinedSuggestion = [last.suggestion, current.suggestion]
        .filter(Boolean)
        .filter((value, idx, array) => array.indexOf(value) === idx)
        .join('\n');
      last.endOffset = Math.max(lastEnd, current.endOffset ?? lastEnd);
      last.suggestion = combinedSuggestion || last.suggestion;
      last.message = last.message ?? current.message;
      if (last.excerpt.length < current.excerpt.length) {
        last.excerpt = current.excerpt;
      }
      continue;
    }

    merged.push(current);
  }

  return merged;
};
