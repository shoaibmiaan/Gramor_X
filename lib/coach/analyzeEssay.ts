// lib/coach/analyzeEssay.ts
// Lightweight heuristics to convert an IELTS essay into predictor inputs.

import { percentToBand, runPredictor, type PredictorInput } from '@/lib/predictor';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const percentRange = (value: number, min: number, max: number) => {
  if (max === min) return 0;
  if (value <= min) return 0;
  if (value >= max) return 100;
  return ((value - min) / (max - min)) * 100;
};

const CONNECTORS = [
  'however',
  'moreover',
  'furthermore',
  'therefore',
  'because',
  'although',
  'whereas',
  'while',
  'since',
  'overall',
  'in conclusion',
  'in addition',
  'additionally',
  'consequently',
  'thus',
  'finally',
  'firstly',
  'secondly',
  'besides',
  'meanwhile',
  'instead',
];

export type EssayStats = Readonly<{
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  connectorCount: number;
  uniqueWordRatio: number; // 0..1
  averageSentenceLength: number;
  longSentenceRatio: number; // 0..1
  punctuationPerSentence: number;
}>;

export type WritingPercentages = Readonly<{
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
}>;

export type EssayAnalysis = Readonly<{
  stats: EssayStats;
  writing: WritingPercentages;
  predictorInput: PredictorInput;
  suggestions: string[];
}>;

export function computeEssayStats(text: string): EssayStats {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const words = normalized ? normalized.split(/\s+/) : [];
  const wordCount = words.length;

  const sentencePieces = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentenceLengths = sentencePieces.map((s) => s.split(/\s+/).filter(Boolean).length);
  const sentenceCount = sentenceLengths.length;
  const averageSentenceLength = sentenceCount
    ? sentenceLengths.reduce((acc, len) => acc + len, 0) / sentenceCount
    : wordCount;
  const longSentenceRatio = sentenceCount
    ? sentenceLengths.filter((len) => len >= 25).length / sentenceCount
    : 0;

  const paragraphCount = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean).length;

  const lower = text.toLowerCase();
  const wordTokens = lower.match(/[a-zA-Z']+/g) ?? [];
  const uniqueWordRatio = wordTokens.length
    ? new Set(wordTokens).size / wordTokens.length
    : 0;

  const connectorCount = CONNECTORS.reduce((acc, connector) => {
    const pattern = new RegExp(`\\b${connector.replace(/\s+/g, '\\s+')}\\b`, 'g');
    return acc + (lower.match(pattern)?.length ?? 0);
  }, 0);

  const punctuation = text.match(/[,:;!?]/g) ?? [];
  const punctuationPerSentence = sentenceCount
    ? punctuation.length / sentenceCount
    : punctuation.length;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    connectorCount,
    uniqueWordRatio,
    averageSentenceLength,
    longSentenceRatio,
    punctuationPerSentence,
  };
}

function deriveWritingPercentages(stats: EssayStats): WritingPercentages {
  const coverageScore = percentRange(stats.wordCount, 120, 320);
  const paragraphScore = percentRange(stats.paragraphCount, 2, 5);
  const connectorScore = percentRange(stats.connectorCount, 1, 8);
  const uniqueScore = percentRange(stats.uniqueWordRatio * 100, 30, 55);
  const sentenceScore = percentRange(stats.averageSentenceLength, 12, 22);
  const longPenalty = percentRange(stats.longSentenceRatio * 100, 35, 70);
  const punctuationScore = percentRange(stats.punctuationPerSentence, 0.6, 2.4);

  const taskResponse = clamp(38 + coverageScore * 0.45 + paragraphScore * 0.25, 0, 100);
  const coherence = clamp(
    35 +
      coverageScore * 0.2 +
      connectorScore * 0.35 +
      paragraphScore * 0.2 +
      sentenceScore * 0.25,
    0,
    100,
  );
  const lexical = clamp(34 + uniqueScore * 0.65 + coverageScore * 0.2 + connectorScore * 0.1, 0, 100);
  const grammar = clamp(
    35 +
      sentenceScore * 0.3 +
      punctuationScore * 0.25 +
      (100 - longPenalty) * 0.2 +
      coverageScore * 0.15,
    0,
    100,
  );

  return { taskResponse, coherence, lexical, grammar };
}

function buildPredictorInput(stats: EssayStats, writing: WritingPercentages): PredictorInput {
  const avg = (writing.taskResponse + writing.coherence + writing.lexical + writing.grammar) / 4;
  const qualityRatio = avg / 100;

  const readingWpm = Math.round(clamp(150 + qualityRatio * 90, 90, 400));
  const readingAccuracy = Math.round(clamp(55 + qualityRatio * 40, 0, 100));
  const listeningAccuracy = Math.round(clamp(56 + qualityRatio * 38, 0, 100));
  const speakingFluency = Math.round(clamp(55 + qualityRatio * 38, 0, 100));
  const speakingPronunciation = Math.round(clamp(55 + qualityRatio * 36, 0, 100));
  const studyHoursPerWeek = Math.round(clamp(4 + qualityRatio * 8 + (stats.connectorCount ? 3 : 0), 0, 40));

  return {
    readingWpm,
    readingAccuracy,
    listeningAccuracy,
    speakingFluency,
    speakingPronunciation,
    writingTaskResponse: writing.taskResponse,
    writingCoherence: writing.coherence,
    writingGrammar: writing.grammar,
    writingLexical: writing.lexical,
    studyHoursPerWeek,
  };
}

function buildSuggestions(stats: EssayStats, writing: WritingPercentages): string[] {
  const suggestions: string[] = [];
  if (stats.wordCount < 250) suggestions.push('Develop ideas further to reach 250+ words.');
  if (stats.paragraphCount < 4) suggestions.push('Aim for at least four distinct paragraphs (intro, 2 body, conclusion).');
  if (stats.connectorCount < 3) suggestions.push('Add more linking phrases (however, moreover, consequently, etc.).');
  if (stats.uniqueWordRatio < 0.35) suggestions.push('Swap repeated words with precise synonyms to lift lexical range.');
  if (stats.longSentenceRatio > 0.4)
    suggestions.push('Break very long sentences into shorter ones to avoid grammar slips.');
  if (stats.punctuationPerSentence < 0.8)
    suggestions.push('Use commas and transitions to clarify complex ideas.');

  const writingBand = percentToBand((writing.taskResponse + writing.coherence + writing.lexical + writing.grammar) / 4);
  if (writingBand < 6)
    suggestions.push('Review IELTS band descriptors and model essays for structure inspiration.');

  return suggestions;
}

export function analyzeEssay(text: string): EssayAnalysis {
  const stats = computeEssayStats(text);
  const writing = deriveWritingPercentages(stats);
  const predictorInput = buildPredictorInput(stats, writing);
  const suggestions = buildSuggestions(stats, writing);

  return { stats, writing, predictorInput, suggestions };
}

export function predictEssay(text: string) {
  const analysis = analyzeEssay(text);
  const result = runPredictor(analysis.predictorInput);
  return { analysis, result };
}

