import type { NextApiRequest, NextApiResponse } from 'next';

import { trackor } from '@/lib/analytics/trackor.server';
import { getServerClient } from '@/lib/supabaseServer';
import {
  TOTAL_ONBOARDING_STEPS,
  onboardingStateSchema,
  onboardingStepPayloadSchema,
  type OnboardingState,
  type OnboardingStepPayload,
} from '@/lib/onboarding/schema';

const SELECT_COLUMNS =
  // Alias DB "id" -> JSON "user_id" so your existing types continue to work
  'user_id:id,preferred_language,locale,goal_band,exam_date,study_days,study_minutes_per_day,whatsapp_opt_in,phone,notification_channels,onboarding_step,onboarding_complete';

type ErrorResponse = { error: string };

type ProfileRow = {
  user_id: string;
  preferred_language: string | null;
  locale: string | null;
  goal_band: number | null;
  exam_date: string | null;
  study_days: string[] | null;
  study_minutes_per_day: number | null;
  whatsapp_opt_in: boolean | null;
  phone: string | null;
  notification_channels: string[] | null;
  onboarding_step: number | null;
  onboarding_complete: boolean | null;
} | null;

const defaultState: OnboardingState = {
  preferredLanguage: null,
  goalBand: null,
  examDate: null,
  studyDays: null,
  studyMinutesPerDay: null,
  whatsappOptIn: null,
  phone: null,
  onboardingStep: 0,
  onboardingComplete: false,
};

function normalizeState(row: ProfileRow): OnboardingState {
  if (!row) return defaultState;

  const studyDays = Array.isArray(row.study_days) ? row.study_days.filter(Boolean) : [];

  return onboardingStateSchema.parse({
    preferredLanguage: row.preferred_language ?? row.locale ?? null,
    goalBand: typeof row.goal_band === 'number' ? row.goal_band : null,
    examDate: row.exam_date ?? null,
    studyDays: studyDays.length > 0 ? (studyDays as OnboardingState['studyDays']) : null,
    studyMinutesPerDay:
      typeof row.study_minutes_per_day === 'number' && row.study_minutes_per_day > 0
        ? row.study_minutes_per_day
        : null,
    whatsappOptIn: typeof row.whatsapp_opt_in === 'boolean' ? row.whatsapp_opt_in : null,
    phone: row.phone ?? null,
    onboardingStep: typeof row.onboarding_step === 'number' ? row.onboarding_step : 0,
    onboardingComplete: row.onboarding_complete === true,
  });
}

async function fetchProfileRow(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT_COLUMNS)
    .eq('id', userId) // canonical column
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message || 'Unable to load profile');
  }

  return (data as ProfileRow) ?? null;
}

async function upsertProfile(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
  payload: Record<string, unknown>,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    // IMPORTANT: never set user_id (generated); write id instead
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select(SELECT_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Unable to save onboarding progress');
  }

  return (data as ProfileRow) ?? null;
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<OnboardingState | ErrorResponse>,
) {
  const supabase = getServerClient(req, res);
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const row = await fetchProfileRow(supabase, auth.user.id);
    return res.status(200).json(normalizeState(row));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load onboarding state';
    return res.status(500).json({ error: message });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<OnboardingState | ErrorResponse>,
) {
  const supabase = getServerClient(req, res);
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parseResult = onboardingStepPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    const detail = parseResult.error.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({ error: detail || 'Invalid payload' });
  }

  const payload = parseResult.data;

  try {
    const currentRow = await fetchProfileRow(supabase, auth.user.id);
    const currentState = normalizeState(currentRow);
    const profileRow = await applyStep(
      supabase,
      auth.user.id,
      payload,
      currentState,
      currentRow,
    );
    return res.status(200).json(normalizeState(profileRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save onboarding step';
    return res.status(500).json({ error: message });
  }
}

async function applyStep(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
  payload: OnboardingStepPayload,
  current: OnboardingState,
  row: ProfileRow,
): Promise<ProfileRow> {
  const updates: Record<string, unknown> = {};
  let nextStep = Math.max(current.onboardingStep ?? 0, payload.step);
  let nextComplete = current.onboardingComplete;

  if (payload.step === 1) {
    updates.preferred_language = payload.data.preferredLanguage;
    updates.locale = payload.data.preferredLanguage;
  }

  if (payload.step === 2) {
    updates.goal_band = payload.data.goalBand;
  }

  if (payload.step === 3) {
    const examDate = payload.data.examDate?.trim() ? payload.data.examDate : null;
    updates.exam_date = examDate;
  }

  if (payload.step === 4) {
    updates.study_days = payload.data.studyDays;
    updates.study_minutes_per_day = payload.data.minutesPerDay;
  }

  if (payload.step === 5) {
    const phone = payload.data.phone?.trim() ? payload.data.phone.trim() : null;
    updates.whatsapp_opt_in = payload.data.whatsappOptIn;
    updates.phone = phone;

    if (current.phone && !phone) {
      updates.phone = null;
    }

    const existingChannels = Array.isArray(row?.notification_channels)
      ? new Set<string>(row?.notification_channels ?? [])
      : new Set<string>();

    if (payload.data.whatsappOptIn) {
      existingChannels.add('whatsapp');
    } else {
      existingChannels.delete('whatsapp');
    }

    updates.notification_channels = Array.from(existingChannels);

    nextStep = TOTAL_ONBOARDING_STEPS;
    nextComplete = true;
  }

  if (payload.step < TOTAL_ONBOARDING_STEPS && !current.onboardingComplete) {
    nextComplete = false;
  }

  updates.onboarding_step = nextStep;
  updates.onboarding_complete = nextComplete;

  const becameComplete = !current.onboardingComplete && nextComplete;
  const hasStarted = current.onboardingStep <= 0 && payload.step >= 1 && !current.onboardingComplete;

  const profileRow = await upsertProfile(supabase, userId, updates);

  if (hasStarted) {
    await trackor.log('onboarding_start', { user_id: userId, step: payload.step });
  }

  const trackPayload: Record<string, unknown> = { user_id: userId, step: payload.step };
  if (payload.step === 1) trackPayload.preferred_language = payload.data.preferredLanguage;
  if (payload.step === 2) trackPayload.goal_band = payload.data.goalBand;
  if (payload.step === 3) trackPayload.exam_date = updates.exam_date ?? null;
  if (payload.step === 4) {
    trackPayload.study_days = payload.data.studyDays;
    trackPayload.minutes_per_day = payload.data.minutesPerDay;
  }
  if (payload.step === 5) trackPayload.whatsapp_opt_in = payload.data.whatsappOptIn;

  await trackor.log('onboarding_step_complete', trackPayload);

  if (becameComplete) {
    await trackor.log('onboarding_done', { user_id: userId });
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
  }

  return profileRow;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OnboardingState | ErrorResponse>,
) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
