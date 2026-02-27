export type SubscriptionTier = 'seedling' | 'rocket' | 'owl';

export type DashboardFeatureKey =
  | 'basicAnalytics'
  | 'advancedAnalytics'
  | 'smartStudyPlan'
  | 'detailedBreakdown'
  | 'fullAiInsights'
  | 'deepPerformanceReports'
  | 'speakingAnalytics'
  | 'essayEvaluationHistory';

export type MetricPoint = {
  label: string;
  value: number;
};

export type SkillModule = {
  name: string;
  lastAttempt: string;
  band: string;
  progress: number;
  href: string;
};
