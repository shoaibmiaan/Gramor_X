// components/dashboard/DashboardCard.tsx
'use client';

import React from 'react';
import { Card } from '@/components/design-system/Card';
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
    <Card
      interactive
      className={cn(
        'rounded-ds-2xl border-border/70 bg-card/90 p-6 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      {(title || subtitle) && (
        <header className="mb-4 flex flex-col gap-1">
          {title && (
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          )}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </header>
      )}
      {children}
    </Card>
  );
};
