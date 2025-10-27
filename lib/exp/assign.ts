// lib/exp/assign.ts
// Experiment assignment + event helpers used by API routes and SSR.

import { createHash } from 'node:crypto';

import { trackor } from '@/lib/analytics/trackor.server';
import { supabaseService } from '@/lib/supabaseServer';
import type {
  Database,
  ExperimentAssignments,
  ExperimentEvents,
  ExperimentVariants,
  Experiments,
} from '@/types/supabase';

export type ExperimentKey = string;
export type ExperimentStatus =
  | 'draft'
  | 'planned'
  | 'running'
  | 'paused'
  | 'completed'
  | 'disabled';

export type ExperimentAssignmentState = {
  experiment: ExperimentKey;
  variant: string;
  status: ExperimentStatus;
  created: boolean;
  assignedAt: string | null;
  holdout: boolean;
  exposures?: number;
  conversions?: number;
};

export type ExperimentContext = Record<string, unknown>;

type ExperimentConfig = {
  experiment: Pick<
    Experiments,
    'key' | 'status' | 'default_variant' | 'traffic_percentage' | 'metadata'
  > | null;
  variants: Array<
    Pick<ExperimentVariants, 'variant' | 'weight' | 'is_default' | 'metadata'>
  >;
};

type AssignmentRow = Pick<
  ExperimentAssignments,
  | 'variant'
  | 'assigned_at'
  | 'guardrail_state'
  | 'exposures'
  | 'conversions'
  | 'last_exposed_at'
  | 'last_converted_at'
  | 'metadata'
> & { id: number };

const FALLBACK_VARIANT = 'control';

function hashToRatio(seed: string): number {
  const digest = createHash('sha256').update(seed).digest('hex');
  const slice = digest.slice(0, 8);
  const int = parseInt(slice, 16);
  return int / 0xffffffff;
}

function sanitizeContext(context?: ExperimentContext): ExperimentContext {
  if (!context) return {};
  try {
    return JSON.parse(JSON.stringify(context)) as ExperimentContext;
  } catch {
    const safe: ExperimentContext = {};
    for (const [key, value] of Object.entries(context)) {
      const type = typeof value;
      if (value === null || type === 'string' || type === 'number' || type === 'boolean') {
        safe[key] = value as unknown;
      }
    }
    return safe;
  }
}

async function loadConfig(experimentKey: ExperimentKey): Promise<ExperimentConfig> {
  const client = supabaseService<Database>();

  const [{ data: experiment, error: experimentError }, { data: variants, error: variantError }] =
    await Promise.all([
      client
        .from('experiments')
        .select('key,status,default_variant,traffic_percentage,metadata')
        .eq('key', experimentKey)
        .maybeSingle(),
      client
        .from('experiment_variants')
        .select('variant,weight,is_default,metadata')
        .eq('experiment_key', experimentKey),
    ]);

  if (experimentError) {
    throw new Error(experimentError.message);
  }
  if (variantError) {
    throw new Error(variantError.message);
  }

  return {
    experiment: experiment ?? null,
    variants: Array.isArray(variants) ? variants : [],
  };
}

function resolveDefaultVariant(config: ExperimentConfig): string {
  const { experiment, variants } = config;
  const flagged = variants.find((variant) => variant.is_default);
  if (flagged) return flagged.variant;
  if (experiment?.default_variant) return experiment.default_variant;
  if (variants.length > 0) return variants[0]!.variant;
  return FALLBACK_VARIANT;
}

function pickWeightedVariant(
  experimentKey: ExperimentKey,
  userId: string,
  variants: ExperimentConfig['variants'],
  fallback: string,
): string {
  if (!Array.isArray(variants) || variants.length === 0) {
    return fallback;
  }

  const seed = `${experimentKey}:${userId}:variant`;
  const ratio = hashToRatio(seed);

  const totalWeight = variants.reduce((sum, item) => sum + Math.max(0, item.weight ?? 0), 0);
  if (totalWeight <= 0) {
    const index = Math.min(variants.length - 1, Math.floor(ratio * variants.length));
    return variants[index]!.variant;
  }

  let cumulative = 0;
  for (const item of variants) {
    const normalized = (Math.max(0, item.weight ?? 0) || 0) / totalWeight;
    cumulative += normalized;
    if (ratio <= cumulative) {
      return item.variant;
    }
  }

  return variants[variants.length - 1]!.variant;
}

async function fetchAssignment(
  client: ReturnType<typeof supabaseService<Database>>,
  experimentKey: ExperimentKey,
  userId: string,
): Promise<AssignmentRow | null> {
  const { data, error } = await client
    .from('experiment_assignments')
    .select(
      'id, variant, assigned_at, guardrail_state, exposures, conversions, last_exposed_at, last_converted_at, metadata',
    )
    .eq('experiment_key', experimentKey)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? (data as AssignmentRow) : null;
}

type ResolveOptions = {
  experimentKey: ExperimentKey;
  userId: string;
  context?: ExperimentContext;
  skipCreate?: boolean;
};

export async function resolveExperimentAssignment({
  experimentKey,
  userId,
  context,
  skipCreate = false,
}: ResolveOptions): Promise<ExperimentAssignmentState> {
  const client = supabaseService<Database>();
  const config = await loadConfig(experimentKey);
  const status = (config.experiment?.status ?? 'disabled') as ExperimentStatus;
  const defaultVariant = resolveDefaultVariant(config);

  const existing = await fetchAssignment(client, experimentKey, userId);
  if (existing) {
    const holdout = existing.guardrail_state === 'disabled';
    return {
      experiment: experimentKey,
      variant: existing.variant,
      status,
      created: false,
      assignedAt: existing.assigned_at ?? null,
      holdout,
      exposures: existing.exposures ?? undefined,
      conversions: existing.conversions ?? undefined,
    };
  }

  const safeContext = sanitizeContext(context);

  const traffic = Math.max(0, Math.min(100, config.experiment?.traffic_percentage ?? 100));
  const includeRatio = hashToRatio(`${experimentKey}:${userId}:traffic`);
  const inTraffic = includeRatio <= traffic / 100;

  if (skipCreate || status !== 'running' || !inTraffic) {
    return {
      experiment: experimentKey,
      variant: defaultVariant,
      status,
      created: false,
      assignedAt: null,
      holdout: !inTraffic || status !== 'running',
    };
  }

  const chosen = pickWeightedVariant(experimentKey, userId, config.variants, defaultVariant);

  const { data, error } = await client
    .from('experiment_assignments')
    .insert({
      user_id: userId,
      experiment_key: experimentKey,
      variant: chosen,
      metadata: Object.keys(safeContext).length > 0 ? safeContext : undefined,
    })
    .select('id, variant, assigned_at, exposures, conversions, guardrail_state')
    .single();

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }

  let assignment: AssignmentRow | null = null;

  if (data) {
    assignment = {
      id: data.id as number,
      variant: data.variant,
      assigned_at: data.assigned_at ?? null,
      guardrail_state: (data.guardrail_state ?? 'active') as ExperimentAssignments['guardrail_state'],
      exposures: data.exposures ?? 0,
      conversions: data.conversions ?? 0,
      last_exposed_at: null,
      last_converted_at: null,
      metadata: safeContext,
    };
  } else {
    assignment = await fetchAssignment(client, experimentKey, userId);
  }

  if (!assignment) {
    return {
      experiment: experimentKey,
      variant: chosen,
      status,
      created: false,
      assignedAt: null,
      holdout: false,
    };
  }

  const eventPayload: Pick<ExperimentEvents, 'experiment_key' | 'user_id' | 'variant' | 'event' | 'context'> = {
    experiment_key: experimentKey,
    user_id: userId,
    variant: assignment.variant,
    event: 'assign',
    context: safeContext,
  };

  await client.from('experiment_events').insert(eventPayload).catch(() => undefined);
  await trackor
    .log('exp.assign', {
      experiment: experimentKey,
      variant: assignment.variant,
      user_id: userId,
      context: safeContext,
    })
    .catch(() => undefined);

  return {
    experiment: experimentKey,
    variant: assignment.variant,
    status,
    created: true,
    assignedAt: assignment.assigned_at ?? null,
    holdout: false,
    exposures: assignment.exposures ?? undefined,
    conversions: assignment.conversions ?? undefined,
  };
}

type EventOptions = {
  experimentKey: ExperimentKey;
  userId: string;
  context?: ExperimentContext;
};

async function updateAssignmentCounts(
  experimentKey: ExperimentKey,
  userId: string,
  field: 'exposures' | 'conversions',
): Promise<AssignmentRow | null> {
  const client = supabaseService<Database>();
  const current = await fetchAssignment(client, experimentKey, userId);
  if (!current) return null;

  const nextValue = (current[field] ?? 0) + 1;
  const timestampField = field === 'exposures' ? 'last_exposed_at' : 'last_converted_at';
  const updates: Record<string, unknown> = {
    [field]: nextValue,
    [timestampField]: new Date().toISOString(),
  };

  const { data, error } = await client
    .from('experiment_assignments')
    .update(updates)
    .eq('id', current.id)
    .select(
      'id, variant, assigned_at, guardrail_state, exposures, conversions, last_exposed_at, last_converted_at, metadata',
    )
    .single();

  if (error) throw new Error(error.message);
  return data ? (data as AssignmentRow) : current;
}

export async function recordExperimentExposure({
  experimentKey,
  userId,
  context,
}: EventOptions): Promise<ExperimentAssignmentState | null> {
  const assignment = await resolveExperimentAssignment({ experimentKey, userId, context });
  if (assignment.holdout) {
    return assignment;
  }

  const updated = await updateAssignmentCounts(experimentKey, userId, 'exposures');
  if (!updated) return assignment;

  const safeContext = sanitizeContext(context);
  const client = supabaseService<Database>();
  await client
    .from('experiment_events')
    .insert({
      experiment_key: experimentKey,
      user_id: userId,
      variant: updated.variant,
      event: 'expose',
      context: safeContext,
    })
    .catch(() => undefined);

  await trackor
    .log('exp.expose', {
      experiment: experimentKey,
      variant: updated.variant,
      user_id: userId,
      context: safeContext,
    })
    .catch(() => undefined);

  return {
    experiment: experimentKey,
    variant: updated.variant,
    status: assignment.status,
    created: assignment.created,
    assignedAt: updated.assigned_at ?? assignment.assignedAt,
    holdout: false,
    exposures: updated.exposures ?? undefined,
    conversions: updated.conversions ?? undefined,
  };
}

export async function recordExperimentConversion({
  experimentKey,
  userId,
  context,
}: EventOptions): Promise<ExperimentAssignmentState | null> {
  const assignment = await resolveExperimentAssignment({ experimentKey, userId, context });
  if (assignment.holdout) {
    return assignment;
  }

  const updated = await updateAssignmentCounts(experimentKey, userId, 'conversions');
  if (!updated) return assignment;

  const safeContext = sanitizeContext(context);
  const client = supabaseService<Database>();
  await client
    .from('experiment_events')
    .insert({
      experiment_key: experimentKey,
      user_id: userId,
      variant: updated.variant,
      event: 'convert',
      context: safeContext,
    })
    .catch(() => undefined);

  await trackor
    .log('exp.convert', {
      experiment: experimentKey,
      variant: updated.variant,
      user_id: userId,
      context: safeContext,
    })
    .catch(() => undefined);

  return {
    experiment: experimentKey,
    variant: updated.variant,
    status: assignment.status,
    created: assignment.created,
    assignedAt: updated.assigned_at ?? assignment.assignedAt,
    holdout: false,
    exposures: updated.exposures ?? undefined,
    conversions: updated.conversions ?? undefined,
  };
}
