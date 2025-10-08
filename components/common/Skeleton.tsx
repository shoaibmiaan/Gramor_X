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

export default AISkeleton;
