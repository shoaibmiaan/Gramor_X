import { useMemo } from 'react';

import type { SubscriptionTier } from '@/lib/navigation/types';
import type { DashboardData } from '@/hooks/useDashboardData';

export type AIInsight = {
  id: string;
  text: string;
  actionLabel: string;
  href: string;
  locked?: boolean;
  trigger?: 'plateau' | 'weakest-skill' | 'recent-improvement';
};

const byWeaknessOrder = ['writing', 'speaking', 'reading', 'listening'] as const;

const inferWeakestSkill = (data: DashboardData): string => {
  const skillMinutes = new Map<string, number>();
  for (const log of data.studyLogs) {
    const key = (log.skill || 'general').toLowerCase();
    skillMinutes.set(key, (skillMinutes.get(key) ?? 0) + log.minutes);
  }

  for (const skill of byWeaknessOrder) {
    if (!skillMinutes.has(skill) || (skillMinutes.get(skill) ?? 0) < 90) {
      return skill;
    }
  }

  return 'writing';
};

export function useAIInsights(data: DashboardData, tier: SubscriptionTier) {
  return useMemo(() => {
    const depth = tier === 'owl' ? 'deep' : 'standard';
    const insights: AIInsight[] = [];

    const history = data.bandHistory;
    const recent = history.slice(-3);

    if (recent.length >= 3) {
      const drift = Math.abs((recent[2]?.band ?? 0) - (recent[0]?.band ?? 0));
      if (drift < 0.2) {
        insights.push({
          id: 'plateau',
          text:
            depth === 'deep'
              ? 'Your band is plateauing for 3 weeks. Deep intervention: switch to timed writing + instant error loops for the next 5 sessions.'
              : 'Your band trend is flat. Add one timed writing block this week to break the plateau.',
          actionLabel: 'Open writing plan',
          href: '/review/writing',
          trigger: 'plateau',
        });
      }
    }

    const weakestSkill = inferWeakestSkill(data);
    insights.push({
      id: 'weakest-skill',
      text:
        depth === 'deep'
          ? `Weakest skill detected: ${weakestSkill}. Prioritize high-friction drills and coach review in this area.`
          : `Weakest skill detected: ${weakestSkill}. Focus one extra session here this week.`,
      actionLabel: 'Start targeted practice',
      href: weakestSkill === 'reading' ? '/reading' : weakestSkill === 'speaking' ? '/review/speaking' : '/review/writing',
      trigger: 'weakest-skill',
    });

    if (recent.length >= 2) {
      const improvement = (recent.at(-1)?.band ?? 0) - (recent.at(-2)?.band ?? 0);
      if (improvement > 0) {
        insights.push({
          id: 'recent-improvement',
          text: `Nice progress: +${improvement.toFixed(1)} band since last week. Keep momentum with 3 focused tasks today.`,
          actionLabel: 'Continue streak',
          href: '/dashboard#practice',
          trigger: 'recent-improvement',
        });
      }
    }

    return insights.slice(0, 3);
  }, [data, tier]);
}

export default useAIInsights;
