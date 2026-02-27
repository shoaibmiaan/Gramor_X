// lib/listening/questionTypes.ts
import type { Database } from '@/lib/database.types';

// 1. Canonical keys (must match listening_question_types.key)
export const LISTENING_QUESTION_TYPE_KEYS = [
  'mcq',
  'table_completion',
  'sentence_completion',
  'map_labeling',
  'matching',
  'summary_completion',
] as const;

export type ListeningQuestionType =
  (typeof LISTENING_QUESTION_TYPE_KEYS)[number];

// 2. Human labels (for UI)
export const LISTENING_QUESTION_TYPE_LABELS: Record<
  ListeningQuestionType,
  string
> = {
  mcq: 'Multiple Choice',
  table_completion: 'Form / Table / Note Completion',
  sentence_completion: 'Sentence Completion',
  map_labeling: 'Map / Diagram Labeling',
  matching: 'Matching',
  summary_completion: 'Summary Completion',
};

// 3. Short description (optional, nice for tooltips / AI prompts)
export const LISTENING_QUESTION_TYPE_DESCRIPTIONS: Record<
  ListeningQuestionType,
  string
> = {
  mcq: 'Choose the correct option from A/B/C/D.',
  table_completion:
    'Fill missing words in forms, tables, notes, or flowcharts.',
  sentence_completion:
    'Complete the sentence with 1–3 words from the recording.',
  map_labeling:
    'Label places or parts on a map or diagram using the recording.',
  matching:
    'Match speakers, items, or features to the correct list options.',
  summary_completion:
    'Fill a short summary with missing words based on the audio.',
};

// 4. Type guard – use whenever you accept raw strings
export function isListeningQuestionType(
  value: unknown,
): value is ListeningQuestionType {
  if (typeof value !== 'string') return false;
  return (LISTENING_QUESTION_TYPE_KEYS as readonly string[]).includes(value);
}

// 5. Supabase rows (read-only types)
export type ListeningQuestionRow =
  Database['public']['Tables']['listening_questions']['Row'];

export type ListeningQuestionTypeRow =
  Database['public']['Tables']['listening_question_types']['Row'];

// 6. Normalizer from DB row (question_type is text | null in DB)
export function getListeningQuestionTypeFromRow(
  row: ListeningQuestionRow,
): ListeningQuestionType | null {
  const value = row.question_type;
  if (!value) return null;
  return isListeningQuestionType(value) ? value : null;
}

/**
 * If you want to throw hard when DB is dirty.
 */
export function requireListeningQuestionType(
  row: ListeningQuestionRow,
): ListeningQuestionType {
  const t = getListeningQuestionTypeFromRow(row);
  if (!t) {
    throw new Error(
      `Invalid or missing listening question_type for question id=${row.id}, value=${String(
        row.question_type,
      )}`,
    );
  }
  return t;
}
