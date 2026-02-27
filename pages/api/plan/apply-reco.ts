import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { trackor } from '@/lib/analytics/trackor.server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { StudyPlanSchema, type StudyPlan, type StudyTask } from '@/types/plan';
import { coerceStudyPlan } from '@/utils/studyPlan';

type ModuleKey = 'listening' | 'reading' | 'writing' | 'speaking';

const FocusAreaSchema = z.object({
  kind: z.string().trim().min(1).max(32),
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
});

const BodySchema = z.object({
  attemptId: z.string().trim().min(1).max(64),
  module: z.enum(['listening', 'reading', 'writing', 'speaking']),
  focusAreas: z.array(FocusAreaSchema).max(8).optional(),
  reasonCodes: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
});

type FocusArea = z.infer<typeof FocusAreaSchema>;

type ResponseBody =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let parsed;
  try {
    parsed = BodySchema.parse(req.body ?? {});
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message ?? 'invalid_payload' : 'invalid_payload';
    return res.status(400).json({ ok: false, error: message });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { data, error } = await supabase
    .from('study_plans')
    .select('plan_json,start_iso,weeks,goal_band')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (!data) {
    return res.status(404).json({ ok: false, error: 'plan_not_found' });
  }

  const plan = coerceStudyPlan(data.plan_json ?? data, user.id, {
    startISO: data.start_iso ?? undefined,
    weeks: data.weeks ?? undefined,
    goalBand: data.goal_band ?? undefined,
  });

  if (!plan) {
    return res.status(500).json({ ok: false, error: 'plan_invalid' });
  }

  const focusAreas = dedupeFocusAreas(parsed.focusAreas ?? []);
  const reasonCodes = dedupeStrings(parsed.reasonCodes ?? []);

  const recommendations = buildRecommendedTasks(parsed.module, parsed.attemptId, focusAreas);
  if (recommendations.length === 0) {
    await trackor.log('study_plan_reco_applied', {
      user_id: user.id,
      module: parsed.module,
      attempt_id: parsed.attemptId,
      tasks_added: 0,
      reason_codes: reasonCodes,
    });
    return res.status(200).json({ ok: true, inserted: 0, skipped: 0 });
  }

  const existingResourceIds = new Set(
    plan.days.flatMap((day) => day.tasks.map((task) => task.resourceId).filter(Boolean) as string[]),
  );

  const freshTasks = recommendations.filter((task) => !existingResourceIds.has(task.resourceId ?? ''));
  const skipped = recommendations.length - freshTasks.length;

  if (freshTasks.length === 0) {
    await trackor.log('study_plan_reco_applied', {
      user_id: user.id,
      module: parsed.module,
      attempt_id: parsed.attemptId,
      tasks_added: 0,
      reason_codes: reasonCodes,
    });
    return res.status(200).json({ ok: true, inserted: 0, skipped });
  }

  const targetDays = selectTargetDays(plan);
  if (targetDays.length === 0) {
    return res.status(500).json({ ok: false, error: 'no_days_available' });
  }

  freshTasks.forEach((task, index) => {
    const day = targetDays[index % targetDays.length];
    day.tasks.push(task);
  });

  let nextPlan: StudyPlan;
  try {
    nextPlan = StudyPlanSchema.parse(plan);
  } catch (validationError) {
    return res.status(500).json({ ok: false, error: 'plan_validation_failed' });
  }

  const upsertPayload = {
    user_id: user.id,
    plan_json: nextPlan,
    start_iso: nextPlan.startISO,
    weeks: nextPlan.weeks,
    goal_band: nextPlan.goalBand ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from('study_plans')
    .upsert(upsertPayload, { onConflict: 'user_id' });

  if (upsertError) {
    return res.status(500).json({ ok: false, error: upsertError.message });
  }

  await trackor.log('study_plan_reco_applied', {
    user_id: user.id,
    module: parsed.module,
    attempt_id: parsed.attemptId,
    tasks_added: freshTasks.length,
    reason_codes: reasonCodes,
  });

  return res.status(200).json({ ok: true, inserted: freshTasks.length, skipped });
}

function dedupeFocusAreas(input: FocusArea[]): FocusArea[] {
  const seen = new Set<string>();
  const result: FocusArea[] = [];
  input.forEach((area) => {
    const kind = area.kind.trim();
    const key = area.key.trim();
    const label = area.label.trim();
    if (!kind || !key || !label) return;
    const signature = `${kind.toLowerCase()}::${key.toLowerCase()}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    result.push({ kind, key, label });
  });
  return result.slice(0, 6);
}

function dedupeStrings(values: string[]): string[] {
  const set = new Set<string>();
  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    set.add(trimmed);
  });
  return Array.from(set).slice(0, 12);
}

function buildRecommendedTasks(module: ModuleKey, attemptId: string, areas: FocusArea[]): StudyTask[] {
  const tasks: StudyTask[] = [];
  tasks.push(
    createTask({
      type: 'review',
      title: `${capitalize(module)} mock review`,
      estMinutes: 20,
      resourceId: `mock:${module}:${attemptId}:review`,
    }),
  );

  areas.slice(0, 3).forEach((area) => {
    if (tasks.length >= 3) return;
    tasks.push(
      createTask({
        type: mapAreaTaskType(module, area.kind),
        title: buildAreaTitle(module, area),
        estMinutes: area.kind === 'difficulty' ? 15 : 25,
        resourceId: `mock:${module}:${attemptId}:${slugify(area.kind)}:${slugify(area.key)}`,
      }),
    );
  });

  if (tasks.length < 3) {
    tasks.push(
      createTask({
        type: 'review',
        title: `${capitalize(module)} strategy refresh`,
        estMinutes: 15,
        resourceId: `mock:${module}:${attemptId}:strategy`,
      }),
    );
  }

  return tasks.slice(0, 3);
}

function selectTargetDays(plan: StudyPlan) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = startOfWeek(today);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  const weekDays = plan.days.filter((day) => {
    const date = new Date(day.dateISO);
    return date >= start && date < end;
  });

  if (weekDays.length > 0) return weekDays;

  const upcoming = plan.days
    .filter((day) => new Date(day.dateISO) >= today)
    .slice(0, Math.min(7, plan.days.length));

  if (upcoming.length > 0) return upcoming;

  return plan.days.slice(-Math.min(3, plan.days.length));
}

function startOfWeek(date: Date): Date {
  const clone = new Date(date);
  const day = clone.getUTCDay();
  const diff = (day + 6) % 7; // Monday start
  clone.setUTCDate(clone.getUTCDate() - diff);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

function createTask(partial: Omit<StudyTask, 'id' | 'completed'> & { completed?: boolean }): StudyTask {
  return {
    id: generateTaskId(partial.resourceId ?? partial.title),
    ...partial,
    completed: partial.completed ?? false,
    estMinutes: partial.estMinutes ?? 20,
  };
}

function generateTaskId(seed: string) {
  const safeSeed = slugify(seed || 'task');
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${safeSeed}-${Math.random().toString(36).slice(2, 10)}`;
}

function mapAreaTaskType(module: ModuleKey, kind: string): StudyTask['type'] {
  if (kind === 'difficulty') return 'review';
  switch (module) {
    case 'listening':
      return 'listening';
    case 'speaking':
      return 'speaking';
    case 'writing':
      return 'writing';
    default:
      return 'reading';
  }
}

function buildAreaTitle(module: ModuleKey, area: FocusArea): string {
  if (area.kind === 'passage') {
    return `Revisit ${area.label}`;
  }
  if (area.kind === 'difficulty') {
    return `Strategy focus: ${area.label}`;
  }
  const moduleLabel = capitalize(module);
  return `${moduleLabel} drill: ${area.label}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item';
}

function capitalize(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
