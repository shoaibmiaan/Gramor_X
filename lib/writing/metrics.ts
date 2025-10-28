const CLEAN_REGEX = /[^a-z\s']/g;
const SENTENCE_REGEX = /[^.!?]+[.!?]/g;
const HEDGING_PHRASES = [
  'i think',
  'i believe',
  'maybe',
  'perhaps',
  'sort of',
  'kind of',
  'it seems',
  'in my opinion',
  'i guess',
  'probably',
  'possibly',
];

const TEMPLATE_PHRASES = [
  'in conclusion',
  'on the one hand',
  'on the other hand',
  'firstly',
  'secondly',
  'thirdly',
  'to begin with',
  'moreover',
  'in addition',
  'furthermore',
  'in summary',
  'overall',
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(CLEAN_REGEX, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text: string): string[] {
  const matches = text.match(SENTENCE_REGEX);
  if (matches && matches.length > 0) return matches.map((s) => s.trim());
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function calcWpm(wordCount: number, timeSpentMs: number): number {
  if (timeSpentMs <= 0) return 0;
  const minutes = timeSpentMs / 60000;
  if (minutes <= 0) return 0;
  return Math.round((wordCount / minutes) * 10) / 10;
}

export function calcTtr(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const unique = new Set(tokens);
  return Math.round((unique.size / tokens.length) * 100) / 100;
}

export function calcCohesionDensity(text: string): number {
  const sents = sentences(text);
  if (sents.length === 0) return 0;
  const cohesiveMarkers = ['however', 'therefore', 'thus', 'meanwhile', 'consequently', 'as a result', 'similarly', 'additionally'];
  const total = sents.reduce((count, sentence) => {
    const normalized = sentence.toLowerCase();
    return (
      count +
      cohesiveMarkers.reduce((markerCount, marker) => (normalized.includes(marker) ? markerCount + 1 : markerCount), 0)
    );
  }, 0);
  const density = total / sents.length;
  return Math.round(density * 100) / 100;
}

export function calcTemplateOveruse(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  const phraseHits = TEMPLATE_PHRASES.reduce((sum, phrase) => {
    const occurrences = text.toLowerCase().split(phrase).length - 1;
    return sum + Math.max(0, occurrences);
  }, 0);
  const normalized = phraseHits / Math.max(tokens.length / 100, 1);
  return Math.round(Math.min(normalized, 5) * 100) / 100;
}

export function calcOriginalityScore(text: string): number {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 1;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const key = `${tokens[i]} ${tokens[i + 1]}`;
    bigrams.set(key, (bigrams.get(key) ?? 0) + 1);
  }
  const repeatedBigrams = Array.from(bigrams.values()).filter((count) => count > 1).length;
  const repetitionPenalty = Math.min(repeatedBigrams / Math.max(bigrams.size, 1), 1);

  const aiPhrases = ['as an ai', 'delve into', 'cutting-edge', 'leveraging technology', 'revolutionizing'];
  const aiHits = aiPhrases.reduce((sum, phrase) => sum + (text.toLowerCase().includes(phrase) ? 1 : 0), 0);

  const hedgeCount = HEDGING_PHRASES.reduce((sum, phrase) => sum + (text.toLowerCase().includes(phrase) ? 1 : 0), 0);
  const hedgePenalty = Math.min(hedgeCount / Math.max(tokens.length / 120, 1), 1);

  const baseScore = 1 - Math.min(repetitionPenalty * 0.5 + aiHits * 0.2 + hedgePenalty * 0.3, 0.95);
  return Math.round(Math.max(baseScore, 0.05) * 100) / 100;
}

export function countHedgingPhrases(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const counts: Record<string, number> = {};
  HEDGING_PHRASES.forEach((phrase) => {
    const occurrences = lower.split(phrase).length - 1;
    if (occurrences > 0) {
      counts[phrase] = occurrences;
    }
  });
  return counts;
}

export function estimatePasteBurst(previous: string, next: string) {
  const prevWords = tokenize(previous).length;
  const nextWords = tokenize(next).length;
  const delta = nextWords - prevWords;
  if (delta <= 80) return null;
  const ratio = prevWords > 0 ? delta / prevWords : 1;
  return {
    words: delta,
    ratio: Math.round(ratio * 100) / 100,
  };
}

export type IntegrityFlags = {
  bulkPaste?: { detected: boolean; words: number; ratio: number };
  hedgingDensity?: number;
  templateOveruse?: number;
  originality?: number;
  handwriting?: { path: string; legibility: number };
};

export function mergeIntegrityFlags(existing: unknown, updates: IntegrityFlags): IntegrityFlags {
  const base: IntegrityFlags = typeof existing === 'object' && existing !== null ? (existing as IntegrityFlags) : {};
  return { ...base, ...updates };
}
