// components/dashboard/SkillsOverview.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import Icon from '@/components/design-system/Icon';
import type { SkillProgress } from '@/lib/dashboard/getDashboardData';

interface SkillsOverviewProps {
  skills: SkillProgress[];
}

export const SkillsOverview: React.FC<SkillsOverviewProps> = ({ skills }) => {
  return (
    <DashboardCard
      title="Skills overview"
      subtitle="Track your strongest and weakest modules in one place."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => {
          const trendName =
            skill.trendDirection === 'up'
              ? 'TrendingUp'
              : skill.trendDirection === 'down'
                ? 'TrendingDown'
                : 'Minus';

          return (
            <Link
              key={skill.id}
              href={skill.href}
              className="rounded-xl border border-border/70 bg-background/60 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {skill.name}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {skill.currentScoreLabel}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{skill.detail}</p>
              <ProgressBar className="mt-3" value={Number(skill.currentScoreLabel) * 10 || 0} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Icon name={trendName} size={12} />
                  <span>{skill.trendLabel}</span>
                </span>
                <span>View details</span>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
};
