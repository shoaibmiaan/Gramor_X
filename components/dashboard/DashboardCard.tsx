// components/dashboard/DashboardCard.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  className,
  children,
}) => {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm',
        'dark:border-slate-800 dark:bg-slate-900/70',
        className,
      )}
    >
      {(title || subtitle) && (
        <header className="mb-3 flex flex-col gap-1">
          {title && (
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </header>
      )}
      {children}
    </section>
  );
};
