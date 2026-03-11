import { describe, expect, it } from 'vitest';

import { computeHomeModuleCards } from '@/lib/home/moduleStatus';

const getModule = (id: string, cards = computeHomeModuleCards()) => cards.find((card) => card.id === id);

describe('computeHomeModuleCards', () => {
  it('gates AI Lab and redirects to pricing when AI toggles are disabled', () => {
    const cards = computeHomeModuleCards({
      featureToggleSnapshot: {
        aiCoach: false,
        studyBuddy: false,
        mistakesBook: false,
      },
      flagEnabled: () => false,
    });

    const aiLab = getModule('ai-lab', cards);
    expect(aiLab).toBeDefined();
    expect(aiLab?.isEnabled).toBe(false);
    expect(aiLab?.statusLabel).toBe('Gated');
    expect(aiLab?.statusTone).toBe('warning');
    expect(aiLab?.ctaHref).toBe('/pricing');
    expect(aiLab?.reason).toContain('AI Lab requires');
  });

  it('enables AI Lab when a backing AI toggle is enabled', () => {
    const cards = computeHomeModuleCards({
      featureToggleSnapshot: {
        aiCoach: true,
        studyBuddy: false,
        mistakesBook: false,
      },
      flagEnabled: () => false,
    });

    const aiLab = getModule('ai-lab', cards);
    expect(aiLab?.isEnabled).toBe(true);
    expect(aiLab?.statusLabel).toBe('Core');
    expect(aiLab?.ctaHref).toBe('/ai');
    expect(aiLab?.reason).toBeNull();
  });

  it('marks analytics as limited when predictor is disabled', () => {
    const cards = computeHomeModuleCards({
      featureToggleSnapshot: {
        bandPredictor: false,
      },
      flagEnabled: () => false,
    });

    const analytics = getModule('analytics', cards);
    expect(analytics?.isEnabled).toBe(true);
    expect(analytics?.statusLabel).toBe('Limited');
    expect(analytics?.statusTone).toBe('neutral');
    expect(analytics?.reason).toContain('Band predictor');
    expect(analytics?.ctaHref).toBe('/progress');
  });

  it('routes gamification to onboarding when challenge access is unavailable', () => {
    const cards = computeHomeModuleCards({
      featureToggleSnapshot: {
        weeklyChallenge: false,
      },
      flagEnabled: () => false,
    });

    const gamification = getModule('gamification', cards);
    expect(gamification?.isEnabled).toBe(false);
    expect(gamification?.statusLabel).toBe('Onboarding');
    expect(gamification?.ctaHref).toBe('/profile/setup');
  });
});
