// components/dashboard/TodayTasks.tsx
import React from 'react';
import { ArrowRight, Clock, BookOpen, Pencil, Mic } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import type { TodayTask } from '@/lib/dashboard/getDashboardData';

interface TodayTasksProps {
  tasks: TodayTask[] | undefined; // ← made explicit (was implicit)
}

const typeMeta = {
  learning: { label: 'Learning', icon: <BookOpen className="h-4 w-4" />, color: 'text-sky-600' },
  practice: { label: 'Practice', icon: <Pencil className="h-4 w-4" />, color: 'text-violet-600' },
  mock: { label: 'Mock Exam', icon: <Mic className="h-4 w-4" />, color: 'text-amber-600' },
} as const;

export const TodayTasks: React.FC<TodayTasksProps> = ({ tasks }) => {
  const safeTasks = tasks ?? [];          // ← defensive fix
  if (!safeTasks.length) return null;

  return (
    <DashboardCard
      title="Today's Smart Plan"
      subtitle="Do these three things today. That’s it."
      className="col-span-1 lg:col-span-2"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {safeTasks.map((task) => {
          const meta = typeMeta[task.type];
          return (
            <a
              key={task.id}
              href={task.href}
              className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/30"
            >
              <div>
                <div className={`inline-flex items-center gap-2 text-sm font-medium ${meta.color}`}>
                  {meta.icon}
                  {meta.label}
                </div>
                <h3 className="mt-4 font-semibold text-foreground leading-tight">{task.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {task.estimatedMinutes} min
                </span>
                <span className="flex items-center gap-1 font-medium text-primary group-hover:underline">
                  Start <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </DashboardCard>
  );
};