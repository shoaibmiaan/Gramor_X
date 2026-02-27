// components/exam/StickyActionBar.tsx
// Shared sticky footer used across exam experiences.

import React from 'react';
import clsx from 'clsx';

type StickyActionBarProps = {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
};

export const StickyActionBar: React.FC<StickyActionBarProps> = ({ left, right, children, className }) => {
  return (
    <div
      className={clsx(
        'sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        className,
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 overflow-x-auto text-sm text-muted-foreground">
          {left}
        </div>
        <div className="flex flex-none items-center gap-3">{children ?? right}</div>
      </div>
    </div>
  );
};

export default StickyActionBar;
