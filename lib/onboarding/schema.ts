import { z } from 'zod';

const supportedLanguageCodes = ['en', 'ur'] as const;
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const learningStyles = ['visual', 'auditory', 'reading_writing', 'kinesthetic', 'mixed'] as const;
const weaknesses = [
  'listening',
  'reading',
  'writing',
  'speaking',
  'grammar',
  'vocabulary',
] as const;

export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
] as const;

const LanguageEnum = z.enum(supportedLanguageCodes);
const StudyDayEnum = z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const);
const CEFRLevelEnum = z.enum(cefrLevels);
const LearningStyleEnum = z.enum(learningStyles);
const WeaknessEnum = z.enum(weaknesses);
export const NotificationChannelEnum = z.enum(['in_app', 'whatsapp', 'email'] as const);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;
export const NOTIFICATION_CHANNELS_IN_DISPLAY_ORDER: readonly NotificationChannel[] = [
  'email',
  'whatsapp',
  'in_app',
] as const;
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

const DiagnosticResultSchema = z.object({
  grammar: z.string().min(1),
  coherence: z.string().min(1),
  vocabulary: z.string().min(1),
  estimated_band: z.number().min(0).max(9),
});

export const onboardingStateSchema = z.object({
  preferredLanguage: LanguageEnum.nullable(),
  goalBand: z.number().min(4).max(9).nullable(),
  examDate: z.string().nullable(),
  studyDays: z.array(StudyDayEnum).min(1).nullable(),
  studyMinutesPerDay: z.number().int().min(10).max(360).nullable(),
  whatsappOptIn: z.boolean().nullable(),
  phone: PhoneSchema.nullable(),
  currentLevel: CEFRLevelEnum.nullable().optional(),
  previousIelts: z
    .object({
      taken: z.boolean(),
      overallBand: z.number().min(0).max(9).nullable().optional(),
      testDate: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  examTimeline: z
    .object({
      timeframe: z.string(),
      examDate: z.string().nullable(),
    })
    .nullable()
    .optional(),
  studyCommitment: z
    .object({
      daysPerWeek: z.number().int().min(1).max(7),
      minutesPerDay: z.number().int().min(10).max(360),
    })
    .nullable()
    .optional(),
  learningStyle: LearningStyleEnum.nullable().optional(),
  weaknesses: z.array(WeaknessEnum).max(3).nullable().optional(),
  confidence: z
    .object({
      writing: z.number().int().min(1).max(5),
      speaking: z.number().int().min(1).max(5),
    })
    .nullable()
    .optional(),
  diagnostic: DiagnosticResultSchema.nullable().optional(),
  onboardingStep: z.number().int().min(0),
  onboardingComplete: z.boolean(),
  updatedAt: z.string().nullable().optional(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

const StepOneSchema = z.object({ step: z.literal(1), data: z.object({}) });
const StepTwoSchema = z.object({
  step: z.literal(2),
  data: z.object({ preferredLanguage: LanguageEnum }),
});
const StepThreeSchema = z.object({
  step: z.literal(3),
  data: z.object({ currentLevel: CEFRLevelEnum }),
});
const StepFourSchema = z.object({
  step: z.literal(4),
  data: z.object({
    taken: z.boolean(),
    overallBand: z.number().min(0).max(9).optional().nullable(),
    testDate: z.string().optional().nullable(),
  }),
});
const StepFiveSchema = z.object({
  step: z.literal(5),
  data: z.object({ goalBand: z.number().min(4).max(9) }),
});
const StepSixSchema = z.object({
  step: z.literal(6),
  data: z.object({
    timeframe: z.string().min(1),
    examDate: z.union([z.string(), z.null()]).optional().nullable(),
  }),
});
const StepSevenSchema = z.object({
  step: z.literal(7),
  data: z.object({
    studyDays: z.array(StudyDayEnum).min(1),
    minutesPerDay: z.number().int().min(10).max(360),
  }),
});
const StepEightSchema = z.object({
  step: z.literal(8),
  data: z.object({ learningStyle: LearningStyleEnum }),
});
const StepNineSchema = z.object({
  step: z.literal(9),
  data: z.object({ weaknesses: z.array(WeaknessEnum).min(1).max(3) }),
});
const StepTenSchema = z.object({
  step: z.literal(10),
  data: z
    .object({
      writing: z.number().int().min(1).max(5),
      speaking: z.number().int().min(1).max(5),
    })
    .nullable(),
});
const StepElevenSchema = z.object({
  step: z.literal(11),
  data: z
    .object({ response: z.string().min(20), result: DiagnosticResultSchema.optional() })
    .nullable(),
});
const StepTwelveSchema = z.object({
  step: z.literal(12),
  data: z.object({
    channels: z.array(NotificationChannelEnum).min(1),
    preferredTime: z.string().trim().min(1).optional().nullable(),
    whatsappOptIn: z.boolean().optional(),
    phone: z.string().trim().optional().nullable(),
  }),
});

export const onboardingStepPayloadSchema = z.discriminatedUnion('step', [
  StepOneSchema,
  StepTwoSchema,
  StepThreeSchema,
  StepFourSchema,
  StepFiveSchema,
  StepSixSchema,
  StepSevenSchema,
  StepEightSchema,
  StepNineSchema,
  StepTenSchema,
  StepElevenSchema,
  StepTwelveSchema,
]);

export type OnboardingStepPayload = z.infer<typeof onboardingStepPayloadSchema>;

export const TOTAL_ONBOARDING_STEPS = 12;

export const languageOptionsEnum = LanguageEnum;
export const studyDayOptionsEnum = StudyDayEnum;
