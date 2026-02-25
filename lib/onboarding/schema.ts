import { z } from 'zod';

// Existing language options (keep if still needed)
export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
] as const;

// New fields
const TargetBandSchema = z.number().min(4).max(9).nullable();
const ExamDateSchema = z.string().nullable(); // ISO date string
const BaselineScoresSchema = z
  .object({
    reading: z.number().min(0).max(9).nullable(),
    writing: z.number().min(0).max(9).nullable(),
    listening: z.number().min(0).max(9).nullable(),
    speaking: z.number().min(0).max(9).nullable(),
  })
  .nullable();
const LearningStyleSchema = z
  .enum(['video', 'tips', 'practice', 'flashcards'])
  .nullable();

// Full onboarding state stored in profile
export const onboardingStateSchema = z.object({
  // Existing fields (keep for backward compatibility)
  preferredLanguage: z.enum(['en', 'ur']).nullable(),
  // New fields
  targetBand: TargetBandSchema,
  examDate: ExamDateSchema,
  baselineScores: BaselineScoresSchema,
  learningStyle: LearningStyleSchema,
  // Keep old study fields if needed, but they may be replaced by AI plan
  studyDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).nullable(),
  studyMinutesPerDay: z.number().int().min(10).max(360).nullable(),
  whatsappOptIn: z.boolean().nullable(),
  phone: z.string().nullable(),
  onboardingStep: z.number().int().min(0),
  onboardingComplete: z.boolean(),
});

export type OnboardingState = z.infer<typeof onboardingStateSchema>;

// Step payload schemas for new steps
export const StepGoalSchema = z.object({
  step: z.literal(1),
  data: z.object({ targetBand: z.number().min(4).max(9) }),
});

export const StepTimelineSchema = z.object({
  step: z.literal(2),
  data: z.object({ examDate: z.string().nullable() }), // allow null for "I don't know"
});

export const StepBaselineSchema = z.object({
  step: z.literal(3),
  data: z.object({
    reading: z.number().min(0).max(9),
    writing: z.number().min(0).max(9),
    listening: z.number().min(0).max(9),
    speaking: z.number().min(0).max(9),
  }),
});

export const StepVibeSchema = z.object({
  step: z.literal(4),
  data: z.object({ learningStyle: z.enum(['video', 'tips', 'practice', 'flashcards']) }),
});

export const onboardingStepPayloadSchema = z.discriminatedUnion('step', [
  StepGoalSchema,
  StepTimelineSchema,
  StepBaselineSchema,
  StepVibeSchema,
]);

export type OnboardingStepPayload = z.infer<typeof onboardingStepPayloadSchema>;

export const TOTAL_ONBOARDING_STEPS = 4; // now 4 steps