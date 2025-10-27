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

import fullExam001 from './full-exam-001.json';
import fullExam002 from './full-exam-002.json';
import fullExam003 from './full-exam-003.json';
import fullExam004 from './full-exam-004.json';
import fullExam005 from './full-exam-005.json';
import fullExam006 from './full-exam-006.json';
import fullExam007 from './full-exam-007.json';
import fullExam008 from './full-exam-008.json';
import fullExam009 from './full-exam-009.json';
import fullExam010 from './full-exam-010.json';
import fullExam011 from './full-exam-011.json';
import sample from './sample-001.json';

const scripts = [
  fullExam001,
  fullExam002,
  fullExam003,
  fullExam004,
  fullExam005,
  fullExam006,
  fullExam007,
  fullExam008,
  fullExam009,
  fullExam010,
  fullExam011,
  sample,
] as AnySpeakingScript[];

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
  'ielts-speaking-full-002':
    'Neighbourhood and volunteering scenarios that build cohesion and ideas for Part 3 discussions.',
  'ielts-speaking-full-003':
    'Health and fitness routine to stretch fluency across lifestyle, habits, and future trends.',
  'ielts-speaking-full-004':
    'Music-focused conversation that blends personal storytelling with cultural commentary.',
  'ielts-speaking-full-005':
    'Time-management storyline with problem-solving prompts to practise complex explanations.',
  'ielts-speaking-full-006':
    'Travel and tourism journey emphasising descriptive language and sustainability opinions.',
  'ielts-speaking-full-007':
    'Education-centred script ideal for sequencing experiences and contrasting learning formats.',
  'ielts-speaking-full-008':
    'Consumer behaviour theme that targets opinion language and persuasive justification.',
  'ielts-speaking-full-009':
    'Environment and sustainability focus to develop cause–effect reasoning and future predictions.',
  'ielts-speaking-full-010':
    'Film and media analysis to sharpen critical thinking and vocabulary for cultural topics.',
  'ielts-speaking-full-011':
    'Food and cooking narrative designed for sensory description and globalisation viewpoints.',
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
