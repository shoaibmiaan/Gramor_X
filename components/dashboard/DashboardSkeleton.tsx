// components/dashboard/DashboardSkeleton.tsx
import { Skeleton } from '@/components/design-system/Skeleton';

export function DashboardSkeleton() {
  return (
    <div className="space-y-12 pb-12 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* AI Overview Panel Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Today's Tasks Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>

      {/* Innovation Tiles Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>

      {/* Saved Items Section Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}