// components/dashboard/QuickActions.tsx
'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import type { QuickAction } from '@/lib/dashboard/getDashboardData';
import { ArrowRight } from 'lucide-react';

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <DashboardCard
      title="Quick actions"
      subtitle="Shortcuts to the places you visit most."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <a
            key={action.id}
            href={action.href}
            className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left text-sm shadow-xs transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {action.label}
              </h3>
              {action.description && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {action.description}
                </p>
              )}
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 group-hover:text-slate-900 dark:text-slate-300">
              Go
              <ArrowRight className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>
    </DashboardCard>
  );
};
