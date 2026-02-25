// components/dashboard/ProfileHeader.tsx
'use client';

import React from 'react';
import { DashboardCard } from './DashboardCard';
import type { ProfileSummary } from '@/lib/dashboard/getDashboardData';
import { Target, CalendarDays } from 'lucide-react';

interface ProfileHeaderProps {
  profile: ProfileSummary;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  return (
    <DashboardCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            IELTS MASTERY DASHBOARD
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Good to see you, {profile.name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Goal: <span className="font-semibold">Band {profile.goalBand}</span>{' '}
            · Current: <span className="font-semibold">Band {profile.currentBandEstimate}</span>{' '}
            · {profile.daysLeft} days left
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <Target className="h-4 w-4" />
            <span>Target: Band {profile.goalBand}</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-slate-700 dark:bg-slate-800/60 dark:text-slate-100">
            <CalendarDays className="h-4 w-4" />
            <span>
              Exam: {new Date(profile.targetExamDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
};
