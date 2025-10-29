// lib/speaking/scoreAudio.ts
// Temporary scoring stub for pronunciation coach. Replace with engine integration later.

import crypto from 'node:crypto';

type ScoreAudioInput = {
  attemptId: string;
  audioUrl?: string | null;
  transcriptHint?: string | null;
};

export type ScoreAudioOverall = {
  pron: number;
  intonation: number;
  stress: number;
  fluency: number;
  band: number;
  wpm: number;
  fillers: number;
};

export type WordScore = {
  text: string;
  startMs: number;
  endMs: number;
  accuracy: number;
  stressOk?: boolean;
  notes?: string;
};

export type PhonemeScore = {
  symbol: string;
  startMs: number;
  endMs: number;
  accuracy: number;
};

export type ScoreAudioResult = {
  overall: ScoreAudioOverall;
  words: WordScore[];
  phonemes: PhonemeScore[];
  weakIPA: string[];
  engine: { name: string; version: string; audioUrl?: string | null };
};

const WEAK_IPA = ['θ', 'ð', 'r', 'l', 'v', 'w', 'æ', 'ʌ', 'ɪ', 'iː'];

function seededRandom(seed: string) {
  let buffer = crypto.createHash('sha256').update(seed).digest();
  let index = 0;
  return () => {
    if (index >= buffer.length) {
      buffer = crypto.createHash('sha256').update(buffer).digest();
      index = 0;
    }
    const value = buffer[index] / 255;
    index += 1;
    return value;
  };
}

function round(value: number, decimals = 2) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export async function scoreAudio(input: ScoreAudioInput): Promise<ScoreAudioResult> {
  const rand = seededRandom(input.attemptId);
  const basePron = 0.6 + rand() * 0.35;
  const baseIntonation = 0.55 + rand() * 0.35;
  const baseStress = 0.55 + rand() * 0.35;
  const baseFluency = 0.58 + rand() * 0.32;
  const wpm = 110 + Math.round(rand() * 40 - 20);
  const fillers = Math.max(0, Math.round(rand() * 6 - 2));
  const band = round(5.5 + (basePron + baseFluency) * 1.5);

  const totalDuration = 45_000 + Math.round(rand() * 10_000 - 5_000);
  const phonemeCount = 10 + Math.floor(rand() * 6);
  const wordCount = 12 + Math.floor(rand() * 6);
  const interval = Math.max(200, Math.floor(totalDuration / Math.max(phonemeCount, wordCount)));

  const phonemes: PhonemeScore[] = Array.from({ length: phonemeCount }).map((_, idx) => {
    const start = idx * interval;
    const end = start + Math.max(120, interval - 40 + Math.round(rand() * 40));
    const accuracy = round(0.4 + rand() * 0.55, 3);
    const symbol = `/${WEAK_IPA[idx % WEAK_IPA.length]}/`;
    return { symbol, startMs: start, endMs: end, accuracy };
  });

  const words: WordScore[] = Array.from({ length: wordCount }).map((_, idx) => {
    const start = idx * interval * 1.1;
    const end = start + Math.max(200, interval + Math.round(rand() * 120));
    const accuracy = round(0.45 + rand() * 0.5, 3);
    const stressOk = rand() > 0.3;
    const notes = stressOk || rand() > 0.5 ? undefined : 'Shift primary stress to the first syllable.';
    return {
      text: `Token ${idx + 1}`,
      startMs: Math.round(start),
      endMs: Math.round(end),
      accuracy,
      stressOk,
      notes,
    };
  });

  const weakIPA = Array.from(
    new Set(
      phonemes
        .filter((item) => item.accuracy < 0.7)
        .map((item) => item.symbol),
    ),
  ).slice(0, 5);

  return {
    overall: {
      pron: round(basePron, 3),
      intonation: round(baseIntonation, 3),
      stress: round(baseStress, 3),
      fluency: round(baseFluency, 3),
      band,
      wpm,
      fillers,
    },
    words,
    phonemes,
    weakIPA,
    engine: {
      name: 'stubbed-pronunciation-engine',
      version: '0.1.0',
      audioUrl: input.audioUrl ?? null,
    },
  };
}
