import { z } from 'zod';

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export const TOTAL_ONBOARDING_STEPS = 12;

export const englishLevelOptions = ['beginner', 'intermediate', 'advanced'] as const;
export const goalTypeOptions = ['immigration', 'university', 'job', 'general improvement'] as const;
export const skillFocusOptions = [
  'reading',
  'writing',
  'speaking',
  'listening',
  'grammar',
  'vocabulary',
] as const;

export const onboardingRowSchema = z.object({
  user_id: z.string().uuid(),
  current_step: z.number().int().min(1).max(TOTAL_ONBOARDING_STEPS).default(1),
  completed_steps: z.array(z.number().int().min(1).max(TOTAL_ONBOARDING_STEPS)).default([]),
  onboarding_completed: z.boolean().default(false),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  native_language: z.string().nullable().optional(),
  target_band: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9)]).nullable().optional(),
  english_level: z.enum(englishLevelOptions).nullable().optional(),
  test_date: z.string().nullable().optional(),
  goal_type: z.enum(goalTypeOptions).nullable().optional(),
  daily_study_minutes: z.string().nullable().optional(),
  skill_focus: z.array(z.enum(skillFocusOptions)).nullable().optional(),
});

export type UserOnboarding = z.infer<typeof onboardingRowSchema>;

export const stepSchemas = {
  1: z.object({}),
  2: z.object({ first_name: z.string().min(1), last_name: z.string().min(1) }),
  3: z.object({ username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/) }),
  4: z.object({ country: z.string().min(2) }),
  5: z.object({ native_language: z.string().min(2) }),
  6: z.object({ target_band: z.union([z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9)]) }),
  7: z.object({ english_level: z.enum(englishLevelOptions) }),
  8: z.object({ test_date: z.string().min(1) }),
  9: z.object({ goal_type: z.enum(goalTypeOptions) }),
  10: z.object({ daily_study_minutes: z.enum(['15', '30', '60', '120+']) }),
  11: z.object({ skill_focus: z.array(z.enum(skillFocusOptions)).min(1) }),
  12: z.object({}),
} as const;

export const onboardingStepPayloadSchema = z.object({
  step: z.number().int().min(1).max(TOTAL_ONBOARDING_STEPS),
  data: z.record(z.unknown()).default({}),
});

export type OnboardingStepPayload = z.infer<typeof onboardingStepPayloadSchema>;

type OnboardingClient = SupabaseClient<Database>;

export async function getOnboarding(supabase: OnboardingClient, userId: string) {
  const { data, error } = await supabase
    .from('user_onboarding')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  if (!data) {
    return {
      user_id: userId,
      current_step: 1,
      completed_steps: [],
      onboarding_completed: false,
      first_name: null,
      last_name: null,
      username: null,
      country: null,
      native_language: null,
      target_band: null,
      english_level: null,
      test_date: null,
      goal_type: null,
      daily_study_minutes: null,
      skill_focus: null,
    } as UserOnboarding;
  }

  return onboardingRowSchema.parse(data);
}

export async function updateOnboarding(
  supabase: OnboardingClient,
  userId: string,
  payload: OnboardingStepPayload,
) {
  const current = await getOnboarding(supabase, userId);
  const schema = stepSchemas[payload.step as keyof typeof stepSchemas];
  const parsedData = schema.parse(payload.data ?? {});

  const completed = Array.from(new Set([...(current.completed_steps ?? []), payload.step])).sort((a, b) => a - b);
  const nextStep = Math.min(TOTAL_ONBOARDING_STEPS, Math.max(current.current_step, payload.step + 1));

  const updates: Partial<UserOnboarding> = {
    ...parsedData,
    current_step: nextStep,
    completed_steps: completed,
    onboarding_completed: current.onboarding_completed,
  };

  const { data, error } = await supabase
    .from('user_onboarding')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);
  return onboardingRowSchema.parse(data);
}

export async function completeOnboarding(supabase: OnboardingClient, userId: string) {
  const current = await getOnboarding(supabase, userId);
  const completed = Array.from({ length: TOTAL_ONBOARDING_STEPS }, (_, i) => i + 1);

  const { data, error } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        ...current,
        current_step: TOTAL_ONBOARDING_STEPS,
        completed_steps: completed,
        onboarding_completed: true,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('profiles').upsert({ id: userId, onboarding_complete: true }, { onConflict: 'id' });
  await supabase.auth.updateUser({ data: { onboarding_complete: true } });

  return onboardingRowSchema.parse(data);
}
