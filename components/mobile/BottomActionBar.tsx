import clsx from 'clsx';
import type { ReactNode } from 'react';

import { SafeArea } from './SafeArea';

export type BottomActionBarProps = {
  leading?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
  className?: string;
  stacked?: boolean;
};

export function BottomActionBar({ leading, trailing, children, className, stacked }: BottomActionBarProps) {
  return (
    <SafeArea
      bottom
      padding={{ bottom: 12 }}
      className={clsx('pointer-events-none sticky bottom-0 left-0 right-0 z-40', className)}
    >
      <div
        className={clsx(
          'pointer-events-auto mx-auto flex w-full max-w-3xl gap-3 rounded-t-3xl border border-border/70 bg-background/95 px-4 py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
          stacked ? 'flex-col' : 'items-center',
        )}
      >
        {leading ? <div className="flex flex-1 items-center justify-start text-sm text-muted-foreground">{leading}</div> : null}
        <div className={clsx('flex flex-none items-center gap-3', stacked ? 'w-full flex-col' : 'justify-end')}>{children ?? trailing}</div>
      </div>
    </SafeArea>
  );
}

export default BottomActionBar;
