// components/dashboard/MockSummary.tsx
'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import type { MockSummaryData } from '@/lib/dashboard/getDashboardData';
import { Timer, BarChart3 } from 'lucide-react';

interface MockSummaryProps {
  mock: MockSummaryData;
}

export const MockSummary: React.FC<MockSummaryProps> = ({ mock }) => {
  return (
    <DashboardCard
      title="Mock exams"
      subtitle="Track how close you are to your target band."
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300">
            Attempts completed
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {mock.totalAttempts}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300">Best band</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-300">
            {mock.bestBand ? `Band ${mock.bestBand}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-300">
            Last attempt
          </span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
            <Timer className="h-3.5 w-3.5" />
            {mock.lastAttemptAt
              ? new Date(mock.lastAttemptAt).toLocaleDateString()
              : 'No mock taken yet'}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <div>
              <p className="font-medium">Next step</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Take a full mock under real timing to update your band estimate.
              </p>
            </div>
          </div>
          <a
            href={mock.nextRecommendedMockHref}
            className="ml-3 inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Start mock
          </a>
        </div>
      </div>
    </DashboardCard>
  );
};
