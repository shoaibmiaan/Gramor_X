'use client';

import React, { createContext, useContext, useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type TabsCtx = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = createContext<TabsCtx | null>(null);

type TabsProps = {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value as string) : internal;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setInternal(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  const ctx = useMemo<TabsCtx>(() => ({ value: currentValue, setValue }), [currentValue, setValue]);

  return (
    <div className={className}>
      <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>
    </div>
  );
}

type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex items-center gap-xs rounded-pill bg-panel/80 p-xs backdrop-blur', className)}
      {...props}
    />
  );
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('TabsTrigger must be used within <Tabs>');
  }
  const active = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? 'active' : 'inactive'}
      className={cn(
        'rounded-pill px-md py-xs text-small font-medium text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active ? 'bg-accent text-bg-light shadow-sm' : 'hover:text-text',
        className,
      )}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          ctx.setValue(value);
        }
      }}
      {...props}
    />
  );
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & { value: string };

export function TabsContent({ className, value, ...props }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('TabsContent must be used within <Tabs>');
  }

  const id = useId();
  const hidden = ctx.value !== value;

  return (
    <div
      id={id}
      role="tabpanel"
      hidden={hidden}
      className={cn('mt-4', className)}
      {...props}
    />
  );
}

export default Tabs;
