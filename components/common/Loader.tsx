import React from 'react';
import clsx from 'clsx';
import { SkeletonTextBlock } from '@/components/loading/Skeletons';
import { useDelayedVisibility } from '@/components/loading/useDelayedVisibility';

interface LoaderProps {
  label?: string;
  className?: string;
  active?: boolean;
}

export const Loader: React.FC<LoaderProps> = ({ label = 'Loading…', className, active = true }) => {
  const showSkeleton = useDelayedVisibility(active, 600);

  if (!showSkeleton) return null;

  return (
    <div className={clsx('space-y-2 text-muted-foreground', className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <SkeletonTextBlock className="max-w-sm" />
    </div>
  );
};

export default Loader;
