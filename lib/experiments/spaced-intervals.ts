// lib/experiments/spaced-intervals.ts
// Experiment assignment + scheduling helpers for spaced review interval A/B test.

import { createHash } from 'node:crypto';

import { supabaseService } from '@/lib/supabaseServer';

const EXPERIMENT_KEY = 'spaced-intervals';

export type SpacedIntervalVariant = 'control' | 'extended';

const VARIANT_CONFIG: Record<SpacedIntervalVariant, { weight: number; intervals: number[] }> = {
  control: { weight: 0.5, intervals: [1, 3, 7, 14, 30] },
  extended: { weight: 0.5, intervals: [1, 4, 9, 16, 35] },
};

function chooseVariant(userId: string): SpacedIntervalVariant {
  const hash = createHash('sha256').update(userId).digest('hex');
  const slice = hash.slice(0, 8);
  const value = parseInt(slice, 16) / 0xffffffff;

  let cumulative = 0;
  for (const [variant, config] of Object.entries(VARIANT_CONFIG) as [
    SpacedIntervalVariant,
    { weight: number; intervals: number[] },
  ][]) {
    cumulative += config.weight;
    if (value <= cumulative) {
      return variant;
    }
  }
  return 'control';
}

async function experimentStatus(): Promise<'planned' | 'running' | 'paused' | 'completed'> {
  const client = supabaseService();
  const table: any = client.from('experiments');
  try {
    const selection = table.select?.('key,status');
    if (selection && typeof selection.eq === 'function') {
      const { data } = await selection.eq('key', EXPERIMENT_KEY).maybeSingle();
      return (data?.status as any) ?? 'planned';
    }
    const result = await selection;
    const rows = Array.isArray(result?.data) ? result.data : [];
    const match = rows.find((row: any) => row?.key === EXPERIMENT_KEY);
    if (match?.status) {
      return match.status as any;
    }
  } catch (error) {
    console.warn('[experiments] failed to read spaced interval status', error);
  }
  return 'planned';
}

export async function resolveSpacedIntervalVariant(userId: string): Promise<SpacedIntervalVariant> {
  if (!userId) return 'control';

  const status = await experimentStatus();
  if (status !== 'running') {
    return 'control';
  }

  const client = supabaseService();
  let assignment: any = null;
  const table: any = client.from('experiment_assignments');
  try {
    const selection = table.select?.('user_id,experiment_key,variant,guardrail_state');
    if (selection && typeof selection.eq === 'function') {
      const { data } = await selection
        .eq('user_id', userId)
        .eq('experiment_key', EXPERIMENT_KEY)
        .maybeSingle();
      assignment = data ?? null;
    } else {
      const result = await selection;
      const rows = Array.isArray(result?.data) ? result.data : [];
      assignment = rows.find(
        (row: any) => row?.user_id === userId && row?.experiment_key === EXPERIMENT_KEY,
      );
    }
  } catch (error) {
    console.warn('[experiments] failed to fetch spaced assignment', error);
  }

  if (assignment?.guardrail_state === 'disabled') {
    return 'control';
  }

  if (assignment?.variant && (assignment.variant === 'control' || assignment.variant === 'extended')) {
    return assignment.variant;
  }

  const assigned = chooseVariant(userId);

  try {
    if (typeof table.upsert === 'function') {
      const { error } = await table.upsert({
        user_id: userId,
        experiment_key: EXPERIMENT_KEY,
        variant: assigned,
      });
      if (error && error.code !== '23505') {
        console.warn('[experiments] failed to persist spaced-interval assignment', error);
      }
    } else if (typeof table.insert === 'function') {
      await table.insert({
        user_id: userId,
        experiment_key: EXPERIMENT_KEY,
        variant: assigned,
      });
    }
  } catch (error) {
    console.warn('[experiments] assignment persistence threw', error);
  }

  return assigned;
}

export function intervalForVariant(variant: SpacedIntervalVariant, repetitions: number): number {
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.control;
  const idx = Math.min(Math.max(0, Math.floor(repetitions)), config.intervals.length - 1);
  return config.intervals[idx];
}

export async function scheduleSpacedReview(
  userId: string,
  repetitions: number,
  referenceDate: Date = new Date(),
): Promise<Date> {
  const variant = await resolveSpacedIntervalVariant(userId);
  const days = intervalForVariant(variant, repetitions);
  const next = new Date(referenceDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
