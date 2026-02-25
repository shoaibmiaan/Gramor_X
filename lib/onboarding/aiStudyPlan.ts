import { z } from 'zod';

export const learningStyleSchema = z.enum(['Video', 'Practice Tests', 'Flashcards', 'Mixed']);
export const skillNameSchema = z.enum(['Reading', 'Writing', 'Listening', 'Speaking']);

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
export type SkillName = z.infer<typeof skillNameSchema>;

export const weeklyPlanItemSchema = z.object({
  week: z.number().int().min(1),
  focus: z.string().min(1),
  tasks: z.array(z.string().min(1)).min(1),
});

export const studyPlanSchema = z.object({
  duration_weeks: z.number().int().min(1),
  daily_hours: z.number().int().min(1).max(4),
  weekly_plan: z.array(weeklyPlanItemSchema).min(1),
  priority_skill: skillNameSchema,
});

export type StudyPlan = z.infer<typeof studyPlanSchema>;

const skillMap: Record<SkillName, keyof OnboardingPayload> = {
  Reading: 'readingLevel',
  Writing: 'writingLevel',
  Listening: 'listeningLevel',
  Speaking: 'speakingLevel',
};

export function daysUntilExam(examDate: string): number {
  const examTs = new Date(examDate).getTime();
  const todayTs = Date.now();
  if (Number.isNaN(examTs)) {
    return 30;
  }

  return Math.max(1, Math.ceil((examTs - todayTs) / 86_400_000));
}

export function calculateDailyHours(examDate: string): 1 | 2 | 4 {
  const days = daysUntilExam(examDate);
  if (days < 30) {
    return 4;
  }

  if (days < 90) {
    return 2;
  }

  return 1;
}

export function weakestSkill(input: OnboardingPayload): SkillName {
  return (Object.keys(skillMap) as SkillName[]).reduce((lowest, skill) => {
    const levelKey = skillMap[skill];
    const lowKey = skillMap[lowest];
    return input[levelKey] < input[lowKey] ? skill : lowest;
  }, 'Reading');
}

function fallbackFocusForWeek(week: number, priority: SkillName, input: OnboardingPayload): string {
  if (week <= 2) {
    return `${priority} priority sprint + IELTS core strategies`;
  }

  if (input.targetBand >= 7.5 && calculateDailyHours(input.examDate) >= 2) {
    return 'Timed exam strategy + high-band response frameworks';
  }

  return 'Foundation strengthening + integrated skills practice';
}

export function buildFallbackPlan(input: OnboardingPayload): StudyPlan {
  const daysRemaining = daysUntilExam(input.examDate);
  const durationWeeks = Math.max(2, Math.min(24, Math.ceil(daysRemaining / 7)));
  const dailyHours = calculateDailyHours(input.examDate);
  const priority = weakestSkill(input);

  const weeklyPlan = Array.from({ length: Math.min(durationWeeks, 12) }, (_, index) => {
    const week = index + 1;

    return {
      week,
      focus: fallbackFocusForWeek(week, priority, input),
      tasks: [
        `Complete ${priority} focused drills (${dailyHours * 25} mins)`,
        week <= 2
          ? `Daily ${priority} correction journal + targeted feedback`
          : 'Take one timed mini-test and review mistakes',
        `Do a ${input.learningStyle} learning block + vocabulary revision`,
      ],
    };
  });

  return {
    duration_weeks: durationWeeks,
    daily_hours: dailyHours,
    weekly_plan: weeklyPlan,
    priority_skill: priority,
  };
}

export function normalizeStudyPlan(input: OnboardingPayload, candidate: unknown): StudyPlan {
  const priority = weakestSkill(input);
  const enforcedDailyHours = calculateDailyHours(input.examDate);
  const fallback = buildFallbackPlan(input);

  const parsed = studyPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    return fallback;
  }

  const weeks = parsed.data.weekly_plan.length > 0 ? parsed.data.weekly_plan : fallback.weekly_plan;
  const firstWeek = weeks[0] ?? fallback.weekly_plan[0];
  const secondWeek = weeks[1] ?? {
    ...firstWeek,
    week: 2,
  };

  const forcedFirstTwo = [
    {
      ...firstWeek,
      week: 1,
      focus: `${priority} priority sprint: ${firstWeek.focus}`,
    },
    {
      ...secondWeek,
      week: 2,
      focus: `${priority} priority sprint: ${secondWeek.focus}`,
    },
  ];

  const rest = weeks.slice(2).map((item, idx) => ({ ...item, week: idx + 3 }));

  return {
    duration_weeks: Math.max(parsed.data.duration_weeks, 2),
    daily_hours: enforcedDailyHours,
    weekly_plan: [...forcedFirstTwo, ...rest],
    priority_skill: priority,
  };
}
