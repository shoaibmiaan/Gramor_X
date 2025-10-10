import { z } from 'zod';

export const languageOptions = ['en', 'ur'] as const;
export const weekdayOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const onboardingStateSchema = z.object({
  preferredLanguage: z.enum(languageOptions).nullable(),
  goalBand: z.number().min(4).max(9).nullable(),
  examDate: z.string().length(10).nullable(),
  studyDays: z.array(z.enum(weekdayOptions)).min(1).nullable(),
  studyMinutesPerDay: z.number().int().min(10).max(360).nullable(),
  whatsappOptIn: z.boolean().nullable(),
  phone: z.string().nullable(),
  onboardingStep: z.number().int().nonnegative(),
  onboardingComplete: z.boolean(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

const languageStepSchema = z.object({
  step: z.literal(1),
  data: z.object({
    preferredLanguage: z.enum(languageOptions),
  }),
});

const bandStepSchema = z.object({
  step: z.literal(2),
  data: z.object({
    goalBand: z.number().min(4).max(9),
  }),
});

const examDateStepSchema = z.object({
  step: z.literal(3),
  data: z.object({
    examDate: z.string().length(10).optional().or(z.literal('')),
  }),
});

const availabilityStepSchema = z.object({
  step: z.literal(4),
  data: z.object({
    studyDays: z.array(z.enum(weekdayOptions)).min(1),
    minutesPerDay: z.number().int().min(15).max(240),
  }),
});

const whatsappStepSchema = z.object({
  step: z.literal(5),
  data: z.object({
    whatsappOptIn: z.boolean(),
    phone: z.string().min(8).max(20).optional().or(z.literal('')),
  }),
});

export const onboardingStepPayloadSchema = z.discriminatedUnion('step', [
  languageStepSchema,
  bandStepSchema,
  examDateStepSchema,
  availabilityStepSchema,
  whatsappStepSchema,
]);

export type OnboardingStepPayload = z.infer<typeof onboardingStepPayloadSchema>;

export const TOTAL_ONBOARDING_STEPS = 5;
