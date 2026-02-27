// components/dashboard/TodayTasks.tsx
'use client';

import React from 'react';
import { ArrowRight, Clock, BookOpen, Pencil, Mic } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import type { TodayTask } from '@/lib/dashboard/getDashboardData';

interface TodayTasksProps {
  tasks: TodayTask[];
}

const typeMeta: Record<
  TodayTask['type'],
  { label: string; icon: React.ReactNode; bg: string; text: string }
> = {
  learning: {
    label: 'Learning',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    bg: 'bg-sky-50 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-200',
  },
  practice: {
    label: 'Practice',
    icon: <Pencil className="h-3.5 w-3.5" />,
    bg: 'bg-violet-50 dark:bg-violet-900/40',
    text: 'text-violet-700 dark:text-violet-200',
  },
  mock: {
    label: 'Mock exam',
    icon: <Mic className="h-3.5 w-3.5" />,
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-200',
  },
};

export const TodayTasks: React.FC<TodayTasksProps> = ({ tasks }) => {
  return (
    <DashboardCard
      title="Today’s smart plan"
      subtitle="Do these three things today. That’s it."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {tasks.map((task) => {
          const meta = typeMeta[task.type];
          return (
            <a
              key={task.id}
              href={task.href}
              className="group flex flex-col justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
            >
              <div className="space-y-2">
                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.bg} ${meta.text}`}
                >
                  {meta.icon}
                  <span>{meta.label}</span>
                </div>
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {task.title}
                </h3>
                <p className="line-clamp-3 text-xs text-slate-600 dark:text-slate-300">
                  {task.description}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{task.estimatedMinutes} min</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-200">
                  Start
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </DashboardCard>
  );
};
