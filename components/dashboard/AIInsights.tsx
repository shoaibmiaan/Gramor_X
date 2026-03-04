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
    <DashboardCard title="AI insights for you" subtitle="Top observations from your recent activity.">
      <div className="space-y-3">
        {insights.map((insight) => (
          <div key={insight.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm transition hover:bg-slate-100 dark:bg-slate-900/70 dark:hover:bg-slate-900">
            <Brain className="mt-0.5 h-5 w-5 text-sky-500" />
            <div>
              <h4 className="font-medium">{insight.title}</h4>
              <p className="mt-1 text-muted-foreground">{insight.body}</p>
              {insight.href && (
                <a href={insight.href} className="mt-2 inline-flex text-xs font-medium text-sky-600 hover:underline">
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