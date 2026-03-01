import type { HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Skeleton } from '@/components/design-system/Skeleton';

type Props = HTMLAttributes<HTMLDivElement>;

export function SkeletonCard({ className, ...rest }: Props) {
  return (
    <div className={clsx('rounded-ds-2xl border border-border/70 bg-card/70 p-5', className)} {...rest}>
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ className, ...rest }: Props) {
  return (
    <div className={clsx('grid grid-cols-12 gap-3 border-b border-border/60 py-3', className)} {...rest}>
      <Skeleton className="col-span-4 h-4" />
      <Skeleton className="col-span-3 h-4" />
      <Skeleton className="col-span-2 h-4" />
      <Skeleton className="col-span-3 h-4" />
    </div>
  );
}

export function SkeletonTextBlock({ className, ...rest }: Props) {
  return (
    <div className={clsx('space-y-2', className)} {...rest}>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
