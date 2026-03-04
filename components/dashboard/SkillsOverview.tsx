// components/dashboard/SkillsOverview.tsx
import React from 'react';
import Link from 'next/link';
import { DashboardCard } from './DashboardCard';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import Icon from '@/components/design-system/Icon';
import type { SkillProgress } from '@/lib/dashboard/getDashboardData';

interface SkillsOverviewProps {
  skills: SkillProgress[] | undefined; // ← made explicit
}

export const SkillsOverview: React.FC<SkillsOverviewProps> = ({ skills }) => {
  const safeSkills = skills ?? []; // ← defensive fix

  return (
    <DashboardCard
      title="Skills overview"
      subtitle="Track your strongest and weakest modules in one place."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {safeSkills.map((skill) => {
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
              className="group rounded-2xl border border-border/60 bg-background/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {skill.name}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {skill.currentScoreLabel}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{skill.detail}</p>
              <ProgressBar className="mt-4" value={Number(skill.currentScoreLabel) * 10 || 0} />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name={trendName} size={12} />
                  {skill.trendLabel}
                </span>
                <span className="group-hover:underline">View details</span>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardCard>
  );
};