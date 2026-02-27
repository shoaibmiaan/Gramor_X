// components/dashboard/GamificationSummary.tsx
'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import type { GamificationSummaryData } from '@/lib/dashboard/getDashboardData';
import { Flame, Trophy, Star } from 'lucide-react';

interface GamificationSummaryProps {
  gamification: GamificationSummaryData;
}

export const GamificationSummary: React.FC<GamificationSummaryProps> = ({
  gamification,
}) => {
  return (
    <DashboardCard
      title="Motivation & rewards"
      subtitle="Stay consistent, climb the leaderboard."
    >
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="flex flex-col gap-1 rounded-xl bg-orange-50 px-3 py-2.5 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
            <Flame className="h-3.5 w-3.5" />
            Streak
          </div>
          <div className="text-lg font-bold">
            {gamification.streakDays}
            <span className="ml-1 text-xs font-medium">days</span>
          </div>
          <p className="text-[11px] opacity-80">
            Don’t break it. Even 10 minutes counts.
          </p>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-violet-50 px-3 py-2.5 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
            <Star className="h-3.5 w-3.5" />
            XP this week
          </div>
          <div className="text-lg font-bold">
            {gamification.xpThisWeek}
            <span className="ml-1 text-xs font-medium">XP</span>
          </div>
          <p className="text-[11px] opacity-80">
            Every task you finish pumps this number up.
          </p>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
            <Trophy className="h-3.5 w-3.5" />
            Rank
          </div>
          <div className="text-lg font-bold">
            {gamification.leaderboardRank ?? '—'}
            {gamification.leaderboardRank && (
              <span className="ml-1 text-xs font-medium">#{gamification.leaderboardRank}</span>
            )}
          </div>
          <p className="text-[11px] opacity-80">
            {gamification.leaderboardPercentile
              ? `Top ${gamification.leaderboardPercentile}% of learners.`
              : 'Do a few more tasks to join the leaderboard.'}
          </p>
        </div>
      </div>

      <a
        href={gamification.leaderboardHref}
        className="mt-3 inline-flex items-center text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
      >
        View full leaderboard →
      </a>
    </DashboardCard>
  );
};
