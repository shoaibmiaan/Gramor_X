import type { MetricPoint, SkillModule } from '@/types/dashboard';

export const overview = {
  currentBand: '6.5',
  weeklyImprovement: '+12%',
  nextAction: 'Focus on Writing Task 2 coherence drills for 20 minutes today.',
};

export const trendData: Record<'reading' | 'writing' | 'speaking', MetricPoint[]> = {
  reading: [
    { label: 'W1', value: 5.5 },
    { label: 'W2', value: 5.8 },
    { label: 'W3', value: 6.1 },
    { label: 'W4', value: 6.4 },
  ],
  writing: [
    { label: 'W1', value: 5.0 },
    { label: 'W2', value: 5.3 },
    { label: 'W3', value: 5.7 },
    { label: 'W4', value: 6.0 },
  ],
  speaking: [
    { label: 'W1', value: 5.2 },
    { label: 'W2', value: 5.6 },
    { label: 'W3', value: 5.9 },
    { label: 'W4', value: 6.2 },
  ],
};

export const skillModules: SkillModule[] = [
  { name: 'Reading', lastAttempt: '2 days ago', band: '6.5', progress: 74, href: '/reading' },
  { name: 'Writing', lastAttempt: 'Yesterday', band: '6.0', progress: 61, href: '/writing' },
  { name: 'Speaking', lastAttempt: 'Today', band: '6.0', progress: 68, href: '/speaking' },
];

export const recommendations = [
  'Weak area alert: Sentence variety in Writing Task 2.',
  'Study priority: Reading skimming drills before mock tests.',
  'AI suggestion: Record one speaking response and review filler words.',
];
