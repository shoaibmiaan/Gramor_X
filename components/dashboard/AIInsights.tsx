// components/dashboard/AIInsights.tsx
'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import type { AIInsight } from '@/lib/dashboard/getDashboardData';
import { Brain } from 'lucide-react';

interface AIInsightsProps {
  insights: AIInsight[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  if (!insights.length) return null;

  return (
    <DashboardCard
      title="AI insights for you"
      subtitle="Top observations from your recent activity."
    >
      <div className="space-y-3 text-sm">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-800 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <div className="mt-0.5">
              <Brain className="h-4 w-4 text-sky-500 dark:text-sky-300" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                {insight.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {insight.body}
              </p>
              {insight.href && (
                <a
                  href={insight.href}
                  className="mt-1 inline-flex text-[11px] font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
                >
                  Work on this now →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};
