import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { PlanGenOptionsSchema, generateStudyPlan } from '@/lib/studyPlan';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { StudyPlanSchema, type StudyPlan } from '@/types/plan';

const bodySchema = z
  .object({
    preset: z.string().min(1).max(32).optional(),
  })
  .merge(PlanGenOptionsSchema.omit({ userId: true }));

type QuickStartResponse =
  | { ok: true; plan: StudyPlan; preset?: string }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuickStartResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(req.body ?? {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const message = issue?.message || 'invalid_payload';
      return res.status(400).json({ ok: false, error: message });
    }
    return res.status(400).json({ ok: false, error: 'invalid_payload' });
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient({ req, res });
  } catch (error) {
    console.error('[api/study-plan/quick-start] failed to create supabase client', error);
    return res.status(503).json({ ok: false, error: 'service_unavailable' });
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { preset, ...planInput } = parsed;

  const plan = generateStudyPlan({
    userId: user.id,
    ...planInput,
  });

  let validPlan: StudyPlan;
  try {
    validPlan = StudyPlanSchema.parse(plan);
  } catch (error) {
    console.error('[api/study-plan/quick-start] generated plan failed validation', error);
    return res.status(500).json({ ok: false, error: 'plan_generation_failed' });
  }

  const { error: upsertError } = await supabase
    .from('study_plans')
    .upsert(
      {
        user_id: user.id,
        plan_json: validPlan,
        start_iso: validPlan.startISO,
        weeks: validPlan.weeks,
        goal_band: validPlan.goalBand ?? null,
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    console.error('[api/study-plan/quick-start] failed to persist plan', upsertError);
    return res.status(500).json({ ok: false, error: 'plan_save_failed' });
  }

  return res.status(200).json({ ok: true, plan: validPlan, preset });
}
