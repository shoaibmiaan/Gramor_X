// components/dashboard/QuickActions.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';
import type { QuickAction } from '@/lib/dashboard/getDashboardData';
import Icon from '@/components/design-system/Icon';

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group flex min-h-[136px] flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-6 text-left text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground">{action.label}</h3>
              {action.description && (
                <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              )}
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
              Start
              <Icon name="ArrowRight" size={14} />
            </span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
};
