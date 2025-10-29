// lib/reco/profile.ts
// Helpers for translating task outcomes into learning signals and refreshing profiles.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, LearningModule, LearningProfileRow, LearningTask } from '@/types/supabase';

const PROFILE_SIGNAL_TO_FIELD: Record<string, keyof LearningProfileRow> = {
  'speaking.pron': 'speaking_pron',
  'speaking.fluency': 'speaking_fluency',
  'reading.tfng': 'reading_tfng',
  'reading.mcq': 'reading_mcq',
  'writing.task2': 'writing_task2',
  'vocab.range': 'vocab_range',
  'listening.accuracy': 'listening_accuracy',
};

const OUTCOME_KEY_MAPPINGS: Array<{
  keys: string[];
  signalKey: string;
  module: LearningModule;
}> = [
  { keys: ['speaking_pron', 'pronunciation', 'pron'], signalKey: 'speaking.pron', module: 'speaking' },
  { keys: ['speaking_fluency', 'fluency'], signalKey: 'speaking.fluency', module: 'speaking' },
  { keys: ['reading_tfng', 'tfng'], signalKey: 'reading.tfng', module: 'reading' },
  { keys: ['reading_mcq', 'mcq'], signalKey: 'reading.mcq', module: 'reading' },
  { keys: ['writing_task2', 'task2'], signalKey: 'writing.task2', module: 'writing' },
  { keys: ['vocab_range', 'lexical_range'], signalKey: 'vocab.range', module: 'vocab' },
  { keys: ['listening_accuracy', 'listening'], signalKey: 'listening.accuracy', module: 'listening' },
];

type NumericOutcome = Record<string, unknown> | null | undefined;

export type DerivedSignal = {
  module: LearningModule;
  key: string;
  value: number;
  source: string;
  occurred_at: string;
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(3));
}

function pickOutcomeValue(outcome: NumericOutcome, keys: string[]): number | null {
  if (!outcome) return null;
  for (const key of keys) {
    if (typeof key !== 'string') continue;
    if (Object.prototype.hasOwnProperty.call(outcome, key)) {
      const value = toNumber((outcome as Record<string, unknown>)[key]);
      if (value != null) return value;
    }
  }

  const overall = (outcome as Record<string, unknown>).overall as Record<string, unknown> | undefined;
  if (overall) {
    for (const key of keys) {
      if (!overall) break;
      if (Object.prototype.hasOwnProperty.call(overall, key)) {
        const value = toNumber(overall[key]);
        if (value != null) return value;
      }
    }
  }

  return null;
}

export function deriveSignalsFromOutcome(
  task: LearningTask,
  outcome: NumericOutcome,
  completedAt: Date | null,
): DerivedSignal[] {
  if (!outcome) return [];
  const timestamp = (completedAt ?? new Date()).toISOString();
  const signals: DerivedSignal[] = [];

  OUTCOME_KEY_MAPPINGS.forEach(({ keys, signalKey, module }) => {
    const value = pickOutcomeValue(outcome, keys);
    if (value == null) return;
    signals.push({
      module,
      key: signalKey,
      value: clampScore(value),
      source: `outcome:${task.slug}`,
      occurred_at: timestamp,
    });
  });

  // Opportunistically capture phoneme weak spots if provided.
  const weakIpa = (outcome as Record<string, unknown>).weakIPA as unknown;
  if (Array.isArray(weakIpa)) {
    weakIpa.forEach((symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      signals.push({
        module: 'speaking',
        key: `speaking.ipa:${symbol.replace(/\s+/g, '')}`,
        value: 0.5,
        source: `outcome:${task.slug}`,
        occurred_at: timestamp,
      });
    });
  }

  return signals;
}

export async function refreshLearningProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data: signals, error } = await supabase
    .from('learning_signals')
    .select('module, key, value, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(200);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to load learning_signals', error);
    return;
  }

  const aggregates = new Map<keyof LearningProfileRow, { sum: number; count: number }>();

  (signals ?? []).forEach((signal) => {
    const field = PROFILE_SIGNAL_TO_FIELD[signal.key];
    if (!field) return;
    const numeric = toNumber(signal.value);
    if (numeric == null) return;
    const entry = aggregates.get(field) ?? { sum: 0, count: 0 };
    if (entry.count >= 20) return;
    entry.sum += numeric;
    entry.count += 1;
    aggregates.set(field, entry);
  });

  const payload: Partial<LearningProfileRow> = {
    last_updated_at: new Date().toISOString(),
  };

  aggregates.forEach((agg, field) => {
    if (!agg.count) return;
    payload[field] = clampScore(agg.sum / agg.count) as any;
  });

  const { data: existing, error: profileError } = await supabase
    .from('learning_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to load learning_profile', profileError);
    return;
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from('learning_profiles')
      .insert([{ user_id: userId, ...payload }]);
    if (insertError) {
      // eslint-disable-next-line no-console
      console.error('[reco] failed to insert learning_profile', insertError);
    }
    return;
  }

  const { error: updateError } = await supabase
    .from('learning_profiles')
    .update(payload)
    .eq('user_id', userId);
  if (updateError) {
    // eslint-disable-next-line no-console
    console.error('[reco] failed to update learning_profile', updateError);
  }
}
