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
    <DashboardCard title="Quick actions" subtitle="Shortcuts to the places you visit most." className="col-span-1 lg:col-span-2">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-border/60 bg-background/60 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <h3 className="font-semibold text-foreground">{action.label}</h3>
              {action.description && <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
              Start <Icon name="ArrowRight" size={14} />
            </div>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
};