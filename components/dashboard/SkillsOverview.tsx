// components/dashboard/SkillsOverview.tsx
'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import type { SkillProgress } from '@/lib/dashboard/getDashboardData';

interface SkillsOverviewProps {
  skills: SkillProgress[];
}

export const SkillsOverview: React.FC<SkillsOverviewProps> = ({ skills }) => {
  return (
    <DashboardCard
      title="Your skills this week"
      subtitle="Reading, Listening, Writing, Speaking at a glance."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((skill) => {
          const trendIcon =
            skill.trendDirection === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            ) : skill.trendDirection === 'down' ? (
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-slate-400" />
            );

          const trendClass =
            skill.trendDirection === 'up'
              ? 'text-emerald-600 dark:text-emerald-300'
              : skill.trendDirection === 'down'
              ? 'text-rose-600 dark:text-rose-300'
              : 'text-slate-500 dark:text-slate-400';

          return (
            <a
              key={skill.id}
              href={skill.href}
              className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white/60 p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {skill.name}
                </h3>
                <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {skill.currentScoreLabel}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {skill.detail}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className={`inline-flex items-center gap-1 ${trendClass}`}>
                  {trendIcon}
                  <span>{skill.trendLabel}</span>
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  View details →
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </DashboardCard>
  );
};
