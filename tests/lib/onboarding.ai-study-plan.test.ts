import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  aiClient: {
    generateChatCompletion: vi.fn(),
  },
  isAIAvailable: true,
}));

import { aiClient } from '@/lib/ai/client';
import { buildRuleBasedPlan, generateOnboardingStudyPlan, type OnboardingPayload } from '@/lib/onboarding/aiStudyPlan';

const baseInput: OnboardingPayload = {
  targetBand: 7,
  examDate: '2026-08-01',
  readingLevel: 3,
  writingLevel: 2,
  listeningLevel: 4,
  speakingLevel: 3,
  learningStyle: 'Mixed',
};

describe('generateOnboardingStudyPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses AI JSON output when valid', async () => {
    vi.mocked(aiClient.generateChatCompletion).mockResolvedValueOnce(`\
\`\`\`json
{"duration_weeks":8,"daily_hours":2,"priority_skill":"Writing","weekly_plan":[{"week":1,"focus":"Writing bootcamp","tasks":["Task A","Task B","Task C"]}]}
\`\`\``);

    const plan = await generateOnboardingStudyPlan(baseInput);

    expect(plan.priority_skill).toBe('Writing');
    expect(plan.duration_weeks).toBe(8);
    expect(plan.weekly_plan[0]?.tasks).toHaveLength(3);
  });

  it('falls back to rule-based plan when AI output is invalid', async () => {
    vi.mocked(aiClient.generateChatCompletion).mockResolvedValueOnce('not-json');

    const plan = await generateOnboardingStudyPlan(baseInput);
    const fallback = buildRuleBasedPlan(baseInput);

    expect(plan).toEqual(fallback);
  });
});
