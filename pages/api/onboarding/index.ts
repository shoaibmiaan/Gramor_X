import type { NextApiRequest, NextApiResponse } from 'next';

import { z } from 'zod';
import { trackor } from '@/lib/analytics/trackor.server';
import { getServerClient } from '@/lib/supabaseServer';
import {
  TOTAL_ONBOARDING_STEPS,
  onboardingStateSchema,
  onboardingStepPayloadSchema,
  type OnboardingState,
  type OnboardingStepPayload,
} from '@/lib/onboarding/schema';

const SELECT_COLUMNS = 'id,settings,onboarding_step,onboarding_complete,updated_at';

type ErrorResponse = {
  error: string;
  latestState?: OnboardingState;
};

const postBodySchema = z.object({
  step: z.number().int().min(1).max(TOTAL_ONBOARDING_STEPS),
  data: z.unknown(),
  expectedVersion: z.string().datetime().optional().nullable(),
});

type ProfileRow = {
  id: string;
  settings: Record<string, unknown> | null;
  onboarding_step: number | null;
  onboarding_complete: boolean | null;
  updated_at: string | null;
} | null;

const defaultState: OnboardingState = {
  preferredLanguage: null,
  goalBand: null,
  examDate: null,
  studyDays: null,
  studyMinutesPerDay: null,
  whatsappOptIn: null,
  phone: null,
  currentLevel: null,
  previousIelts: null,
  examTimeline: null,
  studyCommitment: null,
  learningStyle: null,
  weaknesses: null,
  confidence: null,
  diagnostic: null,
  onboardingStep: 0,
  onboardingComplete: false,
  updatedAt: null,
};

function normalizeState(row: ProfileRow): OnboardingState {
  if (!row) return defaultState;

  const settings = (row.settings ?? {}) as Record<string, unknown>;
  const onboarding = ((settings.onboarding ?? {}) as Record<string, unknown>) || {};

  return onboardingStateSchema.parse({
    preferredLanguage:
      typeof onboarding.preferredLanguage === 'string' ? onboarding.preferredLanguage : null,
    goalBand: typeof onboarding.goalBand === 'number' ? onboarding.goalBand : null,
    examDate: typeof onboarding.examDate === 'string' ? onboarding.examDate : null,
    studyDays: Array.isArray(onboarding.studyDays) ? onboarding.studyDays : null,
    studyMinutesPerDay:
      typeof onboarding.studyMinutesPerDay === 'number' ? onboarding.studyMinutesPerDay : null,
    whatsappOptIn: typeof onboarding.whatsappOptIn === 'boolean' ? onboarding.whatsappOptIn : null,
    phone: typeof onboarding.phone === 'string' ? onboarding.phone : null,
    currentLevel: typeof onboarding.currentLevel === 'string' ? onboarding.currentLevel : null,
    previousIelts: onboarding.previousIelts ?? null,
    examTimeline: onboarding.examTimeline ?? null,
    studyCommitment: onboarding.studyCommitment ?? null,
    learningStyle: typeof onboarding.learningStyle === 'string' ? onboarding.learningStyle : null,
    weaknesses: Array.isArray(onboarding.weaknesses) ? onboarding.weaknesses : null,
    confidence: onboarding.confidence ?? null,
    diagnostic: onboarding.diagnostic ?? null,
    onboardingStep: typeof row.onboarding_step === 'number' ? row.onboarding_step : 0,
    onboardingComplete: row.onboarding_complete === true,
    updatedAt: row.updated_at ?? null,
  });
}

async function fetchProfileRow(
  supabase: ReturnType<typeof getServerClient>,
  userId: string,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .select(SELECT_COLUMNS)
    .eq('id', userId)
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

  const bodyResult = postBodySchema.safeParse(req.body);
  if (!bodyResult.success) {
    const detail = bodyResult.error.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({ error: detail || 'Invalid payload' });
  }

  const { step, data, expectedVersion } = bodyResult.data;
  const parseResult = onboardingStepPayloadSchema.safeParse({ step, data });
  if (!parseResult.success) {
    const detail = parseResult.error.issues.map((issue) => issue.message).join(', ');
    return res.status(400).json({ error: detail || 'Invalid payload' });
  }

  const payload = parseResult.data;

  try {
    const currentRow = await fetchProfileRow(supabase, auth.user.id);
    const currentState = normalizeState(currentRow);

    if (expectedVersion && currentState.updatedAt && expectedVersion !== currentState.updatedAt) {
      return res.status(409).json({
        error:
          'Your data has been updated in another session. Please reload to see the latest version.',
        latestState: currentState,
      });
    }

    const profileRow = await applyStep(supabase, auth.user.id, payload, currentState, currentRow);
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
  const settings = (row?.settings ?? {}) as Record<string, unknown>;
  const onboardingSettings = ((settings.onboarding as Record<string, unknown> | undefined) ??
    {}) as Record<string, unknown>;

  let nextStep = Math.max(current.onboardingStep ?? 0, payload.step);
  let nextComplete = current.onboardingComplete;

  if (payload.step === 1) {
    onboardingSettings.welcomeSeenAt = new Date().toISOString();
  }

  onboardingSettings.draft = payload.step < TOTAL_ONBOARDING_STEPS;

  if (payload.step === 2) onboardingSettings.preferredLanguage = payload.data.preferredLanguage;
  if (payload.step === 3) onboardingSettings.currentLevel = payload.data.currentLevel;

  if (payload.step === 4) {
    onboardingSettings.previousIelts = {
      taken: payload.data.taken,
      overallBand: payload.data.overallBand ?? null,
      testDate: payload.data.testDate ?? null,
    };
  }

  if (payload.step === 5) onboardingSettings.goalBand = payload.data.goalBand;

  if (payload.step === 6) {
    const examDate = payload.data.examDate?.trim() ? payload.data.examDate : null;
    onboardingSettings.examDate = examDate;
    onboardingSettings.examTimeline = { timeframe: payload.data.timeframe, examDate };
  }

  if (payload.step === 7) {
    onboardingSettings.studyDays = payload.data.studyDays;
    onboardingSettings.studyMinutesPerDay = payload.data.minutesPerDay;
    onboardingSettings.studyCommitment = {
      daysPerWeek: payload.data.studyDays.length,
      minutesPerDay: payload.data.minutesPerDay,
    };
  }

  if (payload.step === 8) onboardingSettings.learningStyle = payload.data.learningStyle;
  if (payload.step === 9) onboardingSettings.weaknesses = payload.data.weaknesses;
  if (payload.step === 10) onboardingSettings.confidence = payload.data ?? null;

  if (payload.step === 11) {
    onboardingSettings.diagnosticInput = payload.data?.response ?? null;
    onboardingSettings.diagnostic = payload.data?.result ?? null;
  }

  if (payload.step === 12) {
    const phone = payload.data.phone?.trim() ? payload.data.phone.trim() : null;
    const whatsappOptIn =
      typeof payload.data.whatsappOptIn === 'boolean'
        ? payload.data.whatsappOptIn
        : payload.data.channels.includes('whatsapp');

    onboardingSettings.whatsappOptIn = whatsappOptIn;
    onboardingSettings.phone = phone;
    onboardingSettings.notificationChannels = Array.from(new Set(payload.data.channels));
    onboardingSettings.notificationTime = payload.data.preferredTime ?? null;

    nextStep = TOTAL_ONBOARDING_STEPS;
    nextComplete = true;
    onboardingSettings.draft = false;
  }

  if (payload.step < TOTAL_ONBOARDING_STEPS && !current.onboardingComplete) {
    nextComplete = false;
  }

  updates.settings = { ...settings, onboarding: onboardingSettings };
  updates.onboarding_step = nextStep;
  updates.onboarding_complete = nextComplete;

  const becameComplete = !current.onboardingComplete && nextComplete;
  const hasStarted =
    current.onboardingStep <= 0 && payload.step >= 1 && !current.onboardingComplete;

  const profileRow = await upsertProfile(supabase, userId, updates);

  if (hasStarted) {
    await trackor.log('onboarding_start', { user_id: userId, step: payload.step });
  }

  await trackor.log('onboarding_step_complete', { user_id: userId, step: payload.step });

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
