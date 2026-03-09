import { z } from 'zod';

const supportedLanguageCodes = ['en', 'ur'] as const;

export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
] as const;

const LanguageEnum = z.enum(supportedLanguageCodes);
const StudyDayEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const);
export const NotificationChannelEnum = z.enum(['in_app', 'whatsapp', 'email'] as const);
const PhoneSchema = z.union([z.string().min(6).max(32), z.literal('')]);

export const LanguageBody = z.object({
  language: LanguageEnum,
});

export const TargetBandBody = z.object({
  targetBand: z.number().min(4).max(9),
});

export const ExamDateBody = z.object({
  timeframe: z.string().trim().min(1),
  examDate: z.string().trim().min(1).optional().nullable(),
});

export const StudyRhythmBody = z.object({
  rhythm: z.string().trim().min(1),
});

export const NotificationsBody = z.object({
  channels: z.array(NotificationChannelEnum).min(1),
  preferredTime: z.string().trim().min(1).optional().nullable(),
});

export const onboardingStateSchema = z.object({
  preferredLanguage: LanguageEnum.nullable(),
  goalBand: z.number().min(4).max(9).nullable(),
  examDate: z.string().nullable(),
  studyDays: z.array(StudyDayEnum).min(1).nullable(),
  studyMinutesPerDay: z.number().int().min(10).max(360).nullable(),
  whatsappOptIn: z.boolean().nullable(),
  phone: PhoneSchema.nullable(),
  onboardingStep: z.number().int().min(0),
  onboardingComplete: z.boolean(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

const StepOneSchema = z.object({
  step: z.literal(1),
  data: z.object({
    preferredLanguage: LanguageEnum,
  }),
});

const StepTwoSchema = z.object({
  step: z.literal(2),
  data: z.object({
    goalBand: z.number().min(4).max(9),
  }),
});

const StepThreeSchema = z.object({
  step: z.literal(3),
  data: z.object({
    examDate: z.union([z.string(), z.null()]).optional().nullable(),
  }),
});

const StepFourSchema = z.object({
  step: z.literal(4),
  data: z.object({
    studyDays: z.array(StudyDayEnum).min(1),
    minutesPerDay: z.number().int().min(10).max(360),
  }),
});

const StepFiveSchema = z.object({
  step: z.literal(5),
  data: z.object({
    whatsappOptIn: z.boolean(),
    phone: z.string().trim().optional().nullable(),
  }),
});

export const onboardingStepPayloadSchema = z.discriminatedUnion('step', [
  StepOneSchema,
  StepTwoSchema,
  StepThreeSchema,
  StepFourSchema,
  StepFiveSchema,
]);

export type OnboardingStepPayload = z.infer<typeof onboardingStepPayloadSchema>;

export const TOTAL_ONBOARDING_STEPS = 5;

export const languageOptionsEnum = LanguageEnum;
export const studyDayOptionsEnum = StudyDayEnum;
