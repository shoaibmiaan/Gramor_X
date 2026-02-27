import { listAllSummaries } from '@/lib/vocabulary/data';
import type { WordOfDay } from '@/lib/vocabulary/today';

export type MeaningOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type SynonymOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

const ALL_SUMMARIES = listAllSummaries();

const MEANING_POOL: string[] = ALL_SUMMARIES
  .map((item) => (item.shortDefinition ?? '').trim())
  .filter((text) => text.length >= 6);

const HEADWORD_POOL: string[] = ALL_SUMMARIES
  .map((item) => item.headword.trim())
  .filter((text) => text.length > 0);

const randomId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `opt-${counter}`;
  };
})();

function shuffle<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normaliseText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function buildMeaningDistractors(correct: string, count: number): string[] {
  const used = new Set<string>([correct.toLowerCase()]);
  const distractors: string[] = [];
  for (const entry of shuffle(MEANING_POOL)) {
    const lower = entry.toLowerCase();
    if (used.has(lower)) continue;
    used.add(lower);
    distractors.push(entry);
    if (distractors.length >= count) break;
  }

  if (distractors.length < count) {
    // Fallback: craft lightweight distractors from random headwords
    for (const headword of shuffle(HEADWORD_POOL)) {
      const candidate = `A concept related to “${headword}”.`;
      if (used.has(candidate.toLowerCase())) continue;
      used.add(candidate.toLowerCase());
      distractors.push(candidate);
      if (distractors.length >= count) break;
    }
  }

  return distractors.slice(0, count);
}

export function buildMeaningOptions(word: WordOfDay, totalOptions = 4): MeaningOption[] {
  const correct = normaliseText(word.meaning || word.definition);
  if (!correct) return [];

  const incorrect = buildMeaningDistractors(correct, Math.max(totalOptions - 1, 1));

  const base: MeaningOption[] = [
    { id: randomId(), text: correct, isCorrect: true },
    ...incorrect.map((text) => ({ id: randomId(), text, isCorrect: false })),
  ];

  return shuffle(base);
}

function deriveKeywordSynonyms(word: WordOfDay): string[] {
  const synonyms = new Set<string>();
  (word.synonyms ?? []).forEach((entry) => {
    const text = normaliseText(entry);
    if (text) synonyms.add(text);
  });

  if (synonyms.size >= 3) {
    return Array.from(synonyms);
  }

  const loweredWord = word.headword.toLowerCase();
  const tokens = normaliseText(word.meaning)
    .split(/[^a-zA-Z]+/)
    .map((token) => token.toLowerCase())
    .filter((token) => token.length >= 4 && token !== loweredWord);

  for (const token of tokens) {
    if (!token) continue;
    synonyms.add(token);
    if (synonyms.size >= 4) break;
  }

  return Array.from(synonyms);
}

function buildSynonymDistractors(exclude: Set<string>, count: number): string[] {
  const distractors: string[] = [];
  for (const word of shuffle(HEADWORD_POOL)) {
    const lower = word.toLowerCase();
    if (exclude.has(lower)) continue;
    exclude.add(lower);
    distractors.push(word);
    if (distractors.length >= count) break;
  }
  return distractors.slice(0, count);
}

export function buildSynonymOptions(word: WordOfDay, totalOptions = 6): SynonymOption[] {
  const candidates = deriveKeywordSynonyms(word);
  const normalisedCorrect = candidates
    .map((text) => normaliseText(text))
    .filter((text) => text.length > 0);

  if (normalisedCorrect.length === 0) {
    return [];
  }

  const targetCorrect = Math.min(normalisedCorrect.length, Math.max(2, Math.round(totalOptions / 3)));
  const correctOptions = shuffle(normalisedCorrect).slice(0, targetCorrect);
  const exclude = new Set<string>(correctOptions.map((entry) => entry.toLowerCase()));
  exclude.add(word.headword.toLowerCase());

  const distractorCount = Math.max(totalOptions - correctOptions.length, correctOptions.length);
  const distractors = buildSynonymDistractors(exclude, distractorCount);

  const combined: SynonymOption[] = [
    ...correctOptions.map((text) => ({ id: randomId(), text, isCorrect: true })),
    ...distractors.map((text) => ({ id: randomId(), text, isCorrect: false })),
  ];

  return shuffle(combined).slice(0, totalOptions);
}
