import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { lexicalVarietyReport } from './languageTools';

export type ReadinessGate = {
  pass: boolean;
  missing: string[];
  summary: {
    recentBand?: number | null;
    previousBand?: number | null;
    bandDelta?: number | null;
    recentWpm?: number | null;
    requiredDrills: Record<string, number>;
    completedDrills: Record<string, number>;
  };
};

type SupabaseClientTyped = SupabaseClient<Database>;

const REQUIRED_DRILLS_PER_CRITERION = 2;
const REQUIRED_DELTA = 0.5;
const REQUIRED_WPM: Record<'task1' | 'task2', number> = {
  task1: 6,
  task2: 7,
};

const lookbackDays = 14;

const getRecentAttempts = async (client: SupabaseClientTyped, userId: string) => {
  const { data } = await client
    .from('writing_attempts')
    .select('id, status, task_type, overall_band, scores_json, draft_text, time_spent_ms, created_at, writing_metrics (wpm, ttr)')
    .eq('user_id', userId)
    .eq('status', 'scored')
    .order('created_at', { ascending: false })
    .limit(2);

  return data ?? [];
};

const getDrillCompletions = async (client: SupabaseClientTyped, userId: string) => {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await client
    .from('writing_drill_events')
    .select('tags, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', since);

  const completions: Record<string, number> = {};
  (data ?? []).forEach((event) => {
    (event.tags ?? []).forEach((tag) => {
      const upper = tag.toUpperCase();
      completions[upper] = (completions[upper] ?? 0) + 1;
    });
  });
  return completions;
};

const deriveWeakCriteria = (attempt: {
  scores_json: Database['public']['Tables']['writing_attempts']['Row']['scores_json'];
} | null): string[] => {
  if (!attempt?.scores_json) return [];
  const scores = attempt.scores_json as Record<string, number>;
  const criteria: string[] = [];
  (['TR', 'CC', 'LR', 'GRA'] as const).forEach((criterion) => {
    const value = scores[criterion];
    if (typeof value === 'number' && value < 7) {
      criteria.push(criterion);
    }
  });
  return criteria;
};

const summariseReadiness = async (
  client: SupabaseClientTyped,
  userId: string,
): Promise<ReadinessGate> => {
  const [attempts, drillCompletions] = await Promise.all([
    getRecentAttempts(client, userId),
    getDrillCompletions(client, userId),
  ]);

  const latest = attempts[0] ?? null;
  const previous = attempts[1] ?? null;
  const weakCriteria = deriveWeakCriteria(latest);
  const requiredDrills: Record<string, number> = {};
  weakCriteria.forEach((criterion) => {
    requiredDrills[criterion] = REQUIRED_DRILLS_PER_CRITERION;
  });

  const missing: string[] = [];

  const bandDelta = latest?.overall_band && previous?.overall_band ? latest.overall_band - previous.overall_band : null;
  if (bandDelta !== null && bandDelta < REQUIRED_DELTA) {
    missing.push('Increase overall band by at least +0.5 compared with your previous attempt.');
  }

  if (!latest) {
    missing.push('Submit at least one scored attempt to unlock redraft.');
  }

  if (latest) {
    const taskType = (latest.task_type ?? 'task2') as 'task1' | 'task2';
    const wpm = (latest.writing_metrics as { wpm: number | null } | null)?.wpm ?? null;
    if (wpm !== null && wpm < REQUIRED_WPM[taskType]) {
      missing.push(`Reach at least ${REQUIRED_WPM[taskType]} words per minute (current ${wpm}).`);
    } else if (wpm === null && typeof latest.draft_text === 'string') {
      const report = lexicalVarietyReport(latest.draft_text, latest.time_spent_ms ?? 0);
      if (report.wordsPerMinute < REQUIRED_WPM[taskType]) {
        missing.push(`Reach at least ${REQUIRED_WPM[taskType]} words per minute (current ${report.wordsPerMinute}).`);
      }
    }
  }

  Object.entries(requiredDrills).forEach(([criterion, amount]) => {
    const completed = drillCompletions[criterion] ?? 0;
    if (completed < amount) {
      missing.push(`Complete ${amount - completed} more ${criterion} micro-drill(s).`);
    }
  });

  const hasRecentDrill = Object.keys(drillCompletions).length > 0;
  if (!hasRecentDrill) {
    missing.push('Complete at least one targeted micro-drill in the last two weeks.');
  }

  const pass = missing.length === 0;

  return {
    pass,
    missing,
    summary: {
      recentBand: latest?.overall_band ?? null,
      previousBand: previous?.overall_band ?? null,
      bandDelta,
      recentWpm:
        (latest?.writing_metrics as { wpm: number | null } | null)?.wpm ??
        (latest?.draft_text ? lexicalVarietyReport(latest.draft_text, latest.time_spent_ms ?? 0).wordsPerMinute : null),
      requiredDrills,
      completedDrills: drillCompletions,
    },
  };
};

export const evaluateReadiness = async (
  client: SupabaseClientTyped,
  userId: string,
): Promise<ReadinessGate> => {
  const gate = await summariseReadiness(client, userId);

  await client.from('writing_readiness').upsert(
    {
      user_id: userId,
      status: gate.pass ? 'pass' : 'pending',
      gates_json: { missing: gate.missing, summary: gate.summary },
      window_start: new Date().toISOString(),
      window_end: new Date(Date.now() + lookbackDays * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'user_id' },
  );

  return gate;
};
