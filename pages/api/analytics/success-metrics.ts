import type { NextApiRequest, NextApiResponse } from 'next';

import { computeSuccessMetrics, type SuccessMetricsSnapshot } from '@/lib/analytics/success-metrics';
import { supabaseService } from '@/lib/supabaseServer';

const DAY_MS = 86_400_000;
const EXPERIMENT_KEY = 'spaced-intervals';

type ExperimentSummary = {
  key: string;
  status: 'planned' | 'running' | 'paused' | 'completed';
  guardrailReason: string | null;
  metrics?: {
    controlRate: number | null;
    variantRate: number | null;
    uplift: number | null;
  };
};

type ApiResponse =
  | { ok: true; generatedAt: string; metrics: SuccessMetricsSnapshot; experiments: ExperimentSummary[] }
  | { ok: false; error: string };

async function fetchRows<T = any>(
  client: ReturnType<typeof supabaseService>,
  table: string,
  columns: string,
  options: {
    query?: (builder: any) => any;
    fallbackFilter?: (row: any) => boolean;
  } = {},
): Promise<T[]> {
  try {
    const source: any = client.from(table);
    if (typeof source.select === 'function') {
      const selection = source.select(columns);
      if (selection && typeof selection.eq === 'function') {
        const finalSelection = options.query ? options.query(selection) : selection;
        const { data, error } = await finalSelection;
        if (error) throw error;
        return (data ?? []) as T[];
      }
      const result = await selection;
      let rows = Array.isArray(result?.data) ? (result.data as T[]) : [];
      if (options.fallbackFilter) {
        rows = rows.filter(options.fallbackFilter);
      }
      return rows;
    }
  } catch (error) {
    console.warn(`[analytics/success-metrics] failed to fetch ${table}`, error);
  }
  return [];
}

async function updateExperimentStatus(
  client: ReturnType<typeof supabaseService>,
  status: 'running' | 'paused',
  reason: string | null,
) {
  try {
    const table: any = client.from('experiments');
    if (typeof table.update === 'function') {
      const update = table.update({ status, guardrail_reason: reason });
      if (update && typeof update.eq === 'function') {
        await update.eq('key', EXPERIMENT_KEY);
      } else {
        await update;
      }
    }
  } catch (error) {
    console.warn('[analytics/success-metrics] failed to update experiment status', error);
  }
}

async function updateAssignmentsGuardrail(
  client: ReturnType<typeof supabaseService>,
  state: 'active' | 'disabled',
) {
  try {
    const table: any = client.from('experiment_assignments');
    if (typeof table.update === 'function') {
      const update = table.update({ guardrail_state: state });
      if (update && typeof update.eq === 'function') {
        await update.eq('experiment_key', EXPERIMENT_KEY);
      } else {
        await update;
      }
    }
  } catch (error) {
    console.warn('[analytics/success-metrics] failed to update assignments', error);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const client = supabaseService();
    const now = new Date();
    const since = new Date(now.getTime() - 28 * DAY_MS);
    const sinceIso = since.toISOString();

    const [reviewRows, wordRows, assignmentRows, attemptRows, xpRows, experimentRows] = await Promise.all([
      fetchRows(client, 'review_events', 'user_id,event,occurred_at', {
        query: (builder) => builder.gte('occurred_at', sinceIso),
        fallbackFilter: (row) => new Date(row?.occurred_at ?? 0).getTime() >= since.getTime(),
      }),
      fetchRows(client, 'user_word_logs', 'user_id,learned_on', {
        query: (builder) => builder.gte('learned_on', sinceIso),
        fallbackFilter: (row) => new Date(row?.learned_on ?? 0).getTime() >= since.getTime(),
      }),
      fetchRows(client, 'experiment_assignments', 'user_id,experiment_key,variant', {
        fallbackFilter: (row) => row?.experiment_key === EXPERIMENT_KEY,
      }),
      fetchRows(client, 'collocation_attempts', 'user_id,attempts,correct,attempted_at', {
        query: (builder) => builder.gte('attempted_at', sinceIso),
        fallbackFilter: (row) => new Date(row?.attempted_at ?? 0).getTime() >= since.getTime(),
      }),
      fetchRows(client, 'xp_events', 'user_id,amount,meta,created_at,source', {
        query: (builder) => builder.eq('source', 'vocab').gte('created_at', sinceIso),
        fallbackFilter: (row) =>
          row?.source === 'vocab' && new Date(row?.created_at ?? 0).getTime() >= since.getTime(),
      }),
      fetchRows(client, 'experiments', 'key,status,guardrail_reason'),
    ]);

    const metrics = computeSuccessMetrics({
      now,
      reviewEvents: reviewRows.map((row: any) => ({
        userId: row?.user_id ?? null,
        event: (row?.event ?? 'open') as 'open' | 'complete',
        occurredAt: row?.occurred_at ?? now.toISOString(),
      })),
      wordsLearned: wordRows.map((row: any) => ({
        userId: row?.user_id,
        learnedOn: row?.learned_on ?? now.toISOString(),
      })),
      assignments: assignmentRows
        .filter((row: any) => row?.experiment_key === EXPERIMENT_KEY)
        .map((row: any) => ({ userId: row?.user_id, variant: row?.variant ?? 'control' })),
      collocationAttempts: attemptRows.map((row: any) => ({
        userId: row?.user_id ?? null,
        attempts: Number(row?.attempts ?? 0),
        correct: Number(row?.correct ?? 0),
        attemptedAt: row?.attempted_at ?? now.toISOString(),
      })),
      xpEvents: xpRows
        .filter((row: any) => row?.user_id)
        .map((row: any) => ({
          userId: row.user_id as string,
          amount: Number(row?.amount ?? 0),
          createdAt: row?.created_at ?? now.toISOString(),
          meta: row?.meta ?? null,
        })),
    });

    const reviewGuardrail = metrics.guardrails.find(
      (guardrail) => guardrail.metric === 'Review completion rate',
    );

    const experiments = experimentRows.map((row: any) => ({
      key: row?.key as string,
      status: (row?.status as ExperimentSummary['status']) ?? 'planned',
      guardrail_reason: row?.guardrail_reason ?? null,
    }));

    const spaced = experiments.find((exp) => exp.key === EXPERIMENT_KEY);
    if (reviewGuardrail && !reviewGuardrail.ok) {
      if (spaced && spaced.status === 'running') {
        await updateExperimentStatus(client, 'paused', 'Review completion rate below 55%');
        await updateAssignmentsGuardrail(client, 'disabled');
        spaced.status = 'paused';
        spaced.guardrail_reason = 'Review completion rate below 55%';
      }
    } else if (spaced && spaced.status === 'paused' && spaced.guardrail_reason) {
      await updateExperimentStatus(client, 'running', null);
      await updateAssignmentsGuardrail(client, 'active');
      spaced.status = 'running';
      spaced.guardrail_reason = null;
    }

    const payload: ApiResponse = {
      ok: true,
      generatedAt: metrics.generatedAt,
      metrics,
      experiments: experiments.map((exp) => ({
        key: exp.key,
        status: exp.status,
        guardrailReason: exp.guardrail_reason ?? null,
        metrics:
          exp.key === EXPERIMENT_KEY
            ? {
                controlRate: metrics.retention.controlRate,
                variantRate: metrics.retention.variantRate,
                uplift: metrics.retention.uplift,
              }
            : undefined,
      })),
    };

    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('[api/analytics/success-metrics] failed', error);
    return res.status(500).json({ ok: false, error: error?.message ?? 'Unexpected error' });
  }
}
