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

// Rule #1: Short timeline = high intensity
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

// Rule #2: Low skill rating = priority
export function weakestSkill(input: OnboardingPayload): SkillName {
  return (Object.keys(skillMap) as SkillName[]).reduce((lowest, skill) => {
    const levelKey = skillMap[skill];
    const lowKey = skillMap[lowest];
    return input[levelKey] < input[lowKey] ? skill : lowest;
  }, 'Reading');
}

function targetBandTrack(targetBand: number): 'strategy' | 'foundation' {
  // Rule #3: High band target = strategy focus
  // Rule #4: Low band target = foundation focus
  return targetBand >= 7 ? 'strategy' : 'foundation';
}

function focusForWeek(week: number, priority: SkillName, track: 'strategy' | 'foundation'): string {
  if (week <= 2) {
    return `${priority} priority sprint + ${track === 'strategy' ? 'timed strategy' : 'core foundation'}`;
  }

  if (track === 'strategy') {
    return `High-band strategy practice + integrated ${priority} refinement`;
  }

  return `Foundation building + integrated ${priority} reinforcement`;
}

function tasksForWeek(
  week: number,
  priority: SkillName,
  track: 'strategy' | 'foundation',
  dailyHours: number,
  learningStyle: OnboardingPayload['learningStyle'],
): string[] {
  const intensityMinutes = dailyHours * 60;

  if (week <= 2) {
    return [
      `${priority}: ${Math.round(intensityMinutes * 0.45)} min targeted drills and correction loop`,
      `${track === 'strategy' ? 'Timed IELTS section strategy training' : 'Core grammar + vocabulary foundation block'} (${Math.round(intensityMinutes * 0.35)} min)`,
      `${learningStyle} learning session + error-log review (${Math.round(intensityMinutes * 0.2)} min)`,
    ];
  }

  return [
    `Full IELTS mixed practice set (${Math.round(intensityMinutes * 0.5)} min)`,
    `${track === 'strategy' ? 'Band 7+ response strategy and examiner-criteria practice' : 'Accuracy and language foundation strengthening'} (${Math.round(intensityMinutes * 0.3)} min)`,
    `${priority} reinforcement + weekly review (${Math.round(intensityMinutes * 0.2)} min)`,
  ];
}

// Deterministic, rule-based generator (no AI).
export function buildRuleBasedPlan(input: OnboardingPayload): StudyPlan {
  const daysRemaining = daysUntilExam(input.examDate);
  const durationWeeks = Math.max(2, Math.min(24, Math.ceil(daysRemaining / 7)));
  const dailyHours = calculateDailyHours(input.examDate);
  const priority = weakestSkill(input);
  const track = targetBandTrack(input.targetBand);

  const weeklyPlan = Array.from({ length: durationWeeks }, (_, index) => {
    const week = index + 1;
    return {
      week,
      focus: focusForWeek(week, priority, track),
      tasks: tasksForWeek(week, priority, track, dailyHours, input.learningStyle),
    };
  });

  return {
    duration_weeks: durationWeeks,
    daily_hours: dailyHours,
    weekly_plan: weeklyPlan,
    priority_skill: priority,
  };
}

// Backward compatibility for existing imports.
export function buildFallbackPlan(input: OnboardingPayload): StudyPlan {
  return buildRuleBasedPlan(input);
}

export function normalizeStudyPlan(input: OnboardingPayload, candidate: unknown): StudyPlan {
  const parsed = studyPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    return buildRuleBasedPlan(input);
  }

  return parsed.data;
}
