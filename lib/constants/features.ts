// lib/constants/features.ts
import { bool, env } from '@/lib/env';
import { flags } from '@/lib/flags';

export type FeatureToggleKey =
  | 'aiCoach'
  | 'studyBuddy'
  | 'mistakesBook'
  | 'bandPredictor'
  | 'weeklyChallenge'
  | 'whatsappTasks'
  | 'floatingWidget';

export const featureFlags: Record<FeatureToggleKey, boolean> = {
  aiCoach: bool(env.NEXT_PUBLIC_FEATURE_AI_COACH, true),
  studyBuddy: bool(env.NEXT_PUBLIC_FEATURE_STUDY_BUDDY, true),
  mistakesBook: bool(env.NEXT_PUBLIC_FEATURE_MISTAKES_BOOK, true),
  bandPredictor: flags.enabled('predictor'),
  weeklyChallenge: flags.enabled('challenge'),
  whatsappTasks: bool(env.NEXT_PUBLIC_FEATURE_WHATSAPP_TASKS, true),
  floatingWidget: bool(env.NEXT_PUBLIC_FEATURE_FLOATING_WIDGET, true),
};

export const isFeatureEnabled = (key: FeatureToggleKey): boolean => featureFlags[key];
