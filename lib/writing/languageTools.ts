import { calcTtr, calcWpm } from './metrics';

export type LiveSuggestion = {
  paragraphIndex: number;
  issue: string;
  suggestion: string;
  reasoning: string;
  replacement?: string;
  example?: string;
  original?: string;
};

const vagueWords = ['thing', 'stuff', 'very', 'really', 'a lot', 'some people'];
const fillerStarts = ['I think', 'I believe', 'In my opinion'];
const cohesionMarkers = [
  'however',
  'moreover',
  'therefore',
  'consequently',
  'furthermore',
  'meanwhile',
  'nevertheless',
  'additionally',
  'on the other hand',
  'for example',
  'for instance',
  'in contrast',
  'likewise',
  'similarly',
];

const rareWordList = ['congestion', 'mitigate', 'infrastructure', 'levy', 'revitalise', 'decarbonise', 'precinct', 'amenity'];

export const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

const scoreParagraph = (paragraph: string): LiveSuggestion[] => {
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const lower = paragraph.toLowerCase();
  const suggestions: LiveSuggestion[] = [];

  if (!cohesionMarkers.some((marker) => lower.includes(marker))) {
    suggestions.push({
      paragraphIndex: 0,
      issue: 'Add cohesion markers',
      suggestion: 'Introduce a linker such as “Moreover” or “Consequently” to show how this paragraph relates to the previous idea.',
      reasoning: 'Cohesion markers help examiners follow your logic.',
      example: 'Moreover, dedicated bus lanes ensure commutes remain predictable even during peak hours.',
    });
  }

  const vague = vagueWords.find((word) => lower.includes(word));
  if (vague) {
    suggestions.push({
      paragraphIndex: 0,
      issue: 'Replace vague language',
      suggestion: `Swap “${vague}” for a precise noun or metric that anchors the idea.`,
      reasoning: 'Specific wording lifts Task Response and Lexical Resource.',
      example: 'Replace “a lot of people” with “commuters travelling from the western suburbs”.',
    });
  }

  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    const lowerSentence = trimmed.toLowerCase();
    const filler = fillerStarts.find((start) => lowerSentence.startsWith(start));
    if (filler) {
      suggestions.push({
        paragraphIndex: 0,
        issue: 'Remove hedging',
        suggestion: 'Rewrite the sentence without filler starters so the claim sounds confident.',
        reasoning: 'IELTS rewards decisive tone backed by evidence.',
        replacement: trimmed.replace(new RegExp(`^${filler}`, 'i'), '').replace(/^\s*,?\s*/, ''),
        original: trimmed,
      });
    }
  });

  return suggestions;
};

export const critiqueText = (text: string): LiveSuggestion[] => {
  const paragraphs = splitParagraphs(text);
  const suggestions: LiveSuggestion[] = [];

  paragraphs.forEach((paragraph, index) => {
    const scored = scoreParagraph(paragraph).map((item) => ({ ...item, paragraphIndex: index }));
    suggestions.push(...scored);
  });

  return suggestions;
};

export type ParaphraseOption = {
  sentence: string;
  tone: 'neutral' | 'formal' | 'concise';
};

const synonymMap: Record<string, string> = {
  big: 'substantial',
  small: 'modest',
  good: 'beneficial',
  bad: 'detrimental',
  show: 'demonstrate',
  make: 'produce',
  get: 'obtain',
  help: 'facilitate',
  use: 'utilise',
};

const rewriteWithSynonyms = (sentence: string): string => {
  return sentence
    .split(/(\b)/)
    .map((token) => {
      const lower = token.toLowerCase();
      if (synonymMap[lower]) {
        const replacement = synonymMap[lower];
        return token[0] === token[0]?.toUpperCase()
          ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
          : replacement;
      }
      return token;
    })
    .join('');
};

export const paraphraseSentence = (sentence: string): ParaphraseOption[] => {
  const trimmed = sentence.trim();
  if (!trimmed) return [];

  const formal = rewriteWithSynonyms(trimmed);
  const neutral = trimmed.replace(/\bvery\b/gi, 'highly');
  const concise = trimmed.replace(/\b(it is|there is|there are)\b/gi, '').replace(/\s+/g, ' ').trim();

  const options: ParaphraseOption[] = [
    { sentence: neutral, tone: 'neutral' },
    { sentence: formal, tone: 'formal' },
    { sentence: concise, tone: 'concise' },
  ];

  return options.filter((option, index, self) => option.sentence && self.findIndex((item) => item.sentence === option.sentence) === index);
};

export type LexicalReport = {
  wordCount: number;
  typeTokenRatio: number;
  rareWordDensity: number;
  fillerCount: number;
  wordsPerMinute: number;
};

export const lexicalVarietyReport = (text: string, timeSpentMs: number): LexicalReport => {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = tokens.length;
  const ttr = calcTtr(text);
  const rareMatches = tokens.filter((token) => rareWordList.includes(token));
  const fillerMatches = tokens.filter((token) => ['very', 'really', 'just', 'maybe'].includes(token));
  const wpm = calcWpm(wordCount, timeSpentMs);

  return {
    wordCount,
    typeTokenRatio: ttr,
    rareWordDensity: wordCount === 0 ? 0 : Math.round((rareMatches.length / wordCount) * 100) / 100,
    fillerCount: fillerMatches.length,
    wordsPerMinute: wpm,
  };
};

export type CohesionHeatmapEntry = {
  marker: string;
  count: number;
  sentences: number[];
};

export const cohesionHeatmap = (text: string): CohesionHeatmapEntry[] => {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const entries: Record<string, CohesionHeatmapEntry> = {};

  sentences.forEach((sentence, index) => {
    const lower = sentence.toLowerCase();
    cohesionMarkers.forEach((marker) => {
      if (lower.includes(marker)) {
        if (!entries[marker]) {
          entries[marker] = { marker, count: 0, sentences: [] };
        }
        entries[marker].count += 1;
        entries[marker].sentences.push(index);
      }
    });
  });

  return Object.values(entries).sort((a, b) => b.count - a.count || a.marker.localeCompare(b.marker));
};
