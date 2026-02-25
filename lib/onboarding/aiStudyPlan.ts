import { z } from 'zod';

export const learningStyleSchema = z.enum(['Video', 'Practice Tests', 'Flashcards', 'Mixed']);

export const onboardingPayloadSchema = z.object({
  targetBand: z.number().min(5).max(9),
  examDate: z.string().date(),
  readingLevel: z.number().int().min(1).max(5),
  writingLevel: z.number().int().min(1).max(5),
  listeningLevel: z.number().int().min(1).max(5),
  speakingLevel: z.number().int().min(1).max(5),
  learningStyle: learningStyleSchema,
});

export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;

export const studyPlanSchema = z.object({
  duration_weeks: z.number().int().min(1),
  daily_hours: z.number().min(0.5),
  weekly_plan: z.array(
    z.object({
      week: z.number().int().min(1),
      focus: z.string().min(1),
      tasks: z.array(z.string().min(1)).min(1),
    }),
  ).min(1),
  priority_skill: z.enum(['Reading', 'Writing', 'Listening', 'Speaking']),
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;

const skillMap: Record<'Reading' | 'Writing' | 'Listening' | 'Speaking', keyof OnboardingPayload> = {
  Reading: 'readingLevel',
  Writing: 'writingLevel',
  Listening: 'listeningLevel',
  Speaking: 'speakingLevel',
};

export function weakestSkill(input: OnboardingPayload): 'Reading' | 'Writing' | 'Listening' | 'Speaking' {
  return (Object.keys(skillMap) as Array<keyof typeof skillMap>).reduce((lowest, skill) => {
    const levelKey = skillMap[skill];
    const lowKey = skillMap[lowest];
    return input[levelKey] < input[lowKey] ? skill : lowest;
  }, 'Reading');
}

export function buildFallbackPlan(input: OnboardingPayload): StudyPlan {
  const targetDate = new Date(input.examDate);
  const daysRemaining = Math.max(7, Math.ceil((targetDate.getTime() - Date.now()) / 86_400_000));
  const durationWeeks = Math.max(2, Math.min(24, Math.ceil(daysRemaining / 7)));
  const urgencyMultiplier = input.targetBand >= 7.5 && durationWeeks <= 8 ? 1.25 : 1;
  const baselineHours = input.targetBand >= 7 ? 2.5 : 1.5;
  const dailyHours = Number((baselineHours * urgencyMultiplier).toFixed(1));
  const priority = weakestSkill(input);

  const weeklyPlan = Array.from({ length: Math.min(durationWeeks, 8) }, (_, index) => ({
    week: index + 1,
    focus: index < 2 ? `${priority} foundation + Vocabulary` : `Integrated strategy + Timed practice`,
    tasks: [
      `Complete ${priority} focused drills (45 min)`,
      `Take one timed mini-test and review mistakes`,
      `Do ${input.learningStyle} learning block + vocabulary revision`,
    ],
  }));

  return {
    duration_weeks: durationWeeks,
    daily_hours: dailyHours,
    weekly_plan: weeklyPlan,
    priority_skill: priority,
  };
}
