// components/common/Skeleton.tsx
import React from 'react';
import clsx from 'clsx';

import { Card } from '@/components/design-system/Card';
import { Skeleton as BaseSkeleton } from '@/components/design-system/Skeleton';

interface AISkeletonProps {
  className?: string;
  rows?: number;
  showHeader?: boolean;
  children?: React.ReactNode;
}

export const AISkeleton: React.FC<AISkeletonProps> = ({
  className,
  rows = 4,
  showHeader = true,
  children,
}) => {
  return (
    <Card className={clsx('card-surface rounded-ds-2xl p-6', className)}>
      <div className="space-y-4">
        {children}
        {showHeader ? <BaseSkeleton className="h-6 w-36" /> : null}
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, index) => (
            <BaseSkeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </Card>
  );
};

// Layout-specific skeleton components
export const LayoutSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card/30">
        <div className="flex flex-col gap-4 py-5 pt-safe sm:py-6 px-4 sm:px-6">
          <div className="space-y-2">
            <BaseSkeleton className="h-8 w-64 rounded-lg" />
            <BaseSkeleton className="h-4 w-96 max-w-full rounded" />
          </div>
          <nav className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <BaseSkeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </nav>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="py-6 px-4 sm:px-6">
        <div className="card-surface rounded-ds-2xl p-4">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <BaseSkeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="border-b border-border bg-card/30">
        <div className="space-y-4 py-6 pt-safe px-4 sm:px-6">
          <div className="space-y-2">
            <BaseSkeleton className="h-8 w-48 rounded-lg" />
            <BaseSkeleton className="h-4 w-64 rounded" />
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <BaseSkeleton key={i} className="h-6 w-16 rounded-md" />
            ))}
          </div>
        </div>
      </header>

      <div className="py-8 sm:py-10 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BaseSkeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const AuthSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-4 pb-6 pt-20 sm:px-6 md:px-0 md:pt-24">
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/10 shadow-xl md:grid md:grid-cols-2">
          {/* Left panel skeleton */}
          <div className="flex flex-col justify-center p-6 sm:p-10 md:p-12">
            <div className="w-full max-w-md space-y-6">
              <div className="flex items-center gap-3">
                <BaseSkeleton className="h-10 w-10 rounded-xl" />
                <BaseSkeleton className="h-8 w-32 rounded-lg" />
              </div>
              <div className="space-y-2">
                <BaseSkeleton className="h-8 w-48 rounded-lg" />
                <BaseSkeleton className="h-4 w-64 rounded" />
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <BaseSkeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Right panel skeleton */}
          <div className="hidden bg-muted md:flex md:items-center md:justify-center">
            <BaseSkeleton className="h-64 w-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExamSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground dark:bg-dark">
      {/* Header skeleton */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex flex-col gap-4 py-3 pt-safe sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="space-y-2">
              <BaseSkeleton className="h-4 w-24 rounded" />
              <BaseSkeleton className="h-6 w-32 rounded-lg" />
            </div>
          </div>
          <BaseSkeleton className="h-8 w-20 rounded-lg" />
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="flex-1">
        <div className="flex flex-col gap-6 py-6 sm:py-8 md:flex-row md:gap-4 px-4 sm:px-6">
          {/* Sidebar skeleton */}
          <aside className="hidden w-60 shrink-0 md:block">
            <div className="card-surface sticky top-24 rounded-ds-xl p-3">
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <BaseSkeleton key={i} className="h-8 w-full rounded" />
                ))}
              </div>
            </div>
          </aside>

          {/* Content skeleton */}
          <section className="flex-1 min-w-0">
            <BaseSkeleton className="h-96 w-full rounded-xl" />
          </section>
        </div>
      </main>
    </div>
  );
};

export const TeacherSkeleton: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="px-4 sm:px-6">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <BaseSkeleton className="h-8 w-64 mx-auto rounded-lg" />
          <BaseSkeleton className="h-4 w-96 max-w-full mx-auto mt-2 rounded" />
          <div className="flex justify-center gap-2 mt-3">
            <BaseSkeleton className="h-6 w-20 rounded-full" />
            <BaseSkeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>

        <BaseSkeleton className="h-20 w-full rounded-lg mb-6" />

        <BaseSkeleton className="h-8 w-48 rounded-lg mb-4" />
        <BaseSkeleton className="h-4 w-full rounded mb-8" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BaseSkeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISkeleton;