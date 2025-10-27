export type LegacySpeakingScript = {
  id: string;
  title?: string;
  part1?: string[];
  part2?: {
    cueCard?: string[] | string;
    prepSec?: number;
    speakSec?: number;
  };
  part3?: string[];
};

export type ModernSpeakingScript = {
  id: string;
  title?: string;
  module?: string;
  part1?: { introSeconds?: number; questions?: string[] };
  part2?: { cueCard?: string[] | string; prepSeconds?: number; speakSeconds?: number };
  part3?: { questions?: string[] };
};

type AnySpeakingScript = LegacySpeakingScript | ModernSpeakingScript;

type NormalizedSpeakingScript = {
  id: string;
  title: string;
  part1Questions: number;
  part3Questions: number;
  prepSeconds: number;
  speakSeconds: number;
};

import fullExam from './full-exam-001.json';
import sample from './sample-001.json';

const scripts = [fullExam, sample] as AnySpeakingScript[];

const normalizeScript = (raw: AnySpeakingScript): NormalizedSpeakingScript => {
  const part1Array = Array.isArray((raw as LegacySpeakingScript).part1)
    ? (raw as LegacySpeakingScript).part1 ?? []
    : Array.isArray((raw as ModernSpeakingScript).part1?.questions)
    ? (raw as ModernSpeakingScript).part1?.questions ?? []
    : [];

  const part3Array = Array.isArray((raw as LegacySpeakingScript).part3)
    ? (raw as LegacySpeakingScript).part3 ?? []
    : Array.isArray((raw as ModernSpeakingScript).part3?.questions)
    ? (raw as ModernSpeakingScript).part3?.questions ?? []
    : [];

  const part2 = (raw as LegacySpeakingScript).part2 ?? (raw as ModernSpeakingScript).part2 ?? {};
  const prepSeconds = (part2 as any).prepSec ?? (part2 as any).prepSeconds ?? 60;
  const speakSeconds = (part2 as any).speakSec ?? (part2 as any).speakSeconds ?? 120;

  const title = raw.title ?? raw.id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    id: raw.id,
    title,
    part1Questions: part1Array.length,
    part3Questions: part3Array.length,
    prepSeconds,
    speakSeconds,
  };
};

const ESTIMATED_PART1_SECONDS = 45;
const ESTIMATED_PART3_SECONDS = 70;

export type SpeakingPracticeMeta = {
  id: string;
  title: string;
  durationMinutes: number;
  totalPrompts: number;
  description: string;
};

const descriptions: Record<string, string> = {
  'ielts-speaking-full-001':
    'Complete exam-day simulation with recording checkpoints and feedback prompts for every stage.',
  'speaking-sample-001':
    'Shorter general training style script to warm up with everyday topics before a full mock.',
};

export const speakingPracticeList: SpeakingPracticeMeta[] = scripts.map((raw) => {
  const normalized = normalizeScript(raw);
  const estimatedSeconds =
    normalized.part1Questions * ESTIMATED_PART1_SECONDS +
    normalized.part3Questions * ESTIMATED_PART3_SECONDS +
    normalized.prepSeconds +
    normalized.speakSeconds;

  return {
    id: normalized.id,
    title: normalized.title,
    durationMinutes: Math.max(10, Math.round(estimatedSeconds / 60)),
    totalPrompts: normalized.part1Questions + normalized.part3Questions + 1,
    description: descriptions[normalized.id] ??
      'Exam-style practice covering warm-up, cue card, and follow-up discussion prompts.',
  };
});
