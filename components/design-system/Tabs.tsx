'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

type TabsListProps = TabsPrimitive.TabsListProps;
type TabsTriggerProps = TabsPrimitive.TabsTriggerProps;
type TabsContentProps = TabsPrimitive.TabsContentProps;

export const Tabs = TabsPrimitive.Root;

export const TabsList = ({ className, ...props }: TabsListProps) => (
  <TabsPrimitive.List
    className={cn(
      'inline-flex items-center gap-2 rounded-ds-xl bg-surface/60 p-1 dark:bg-surface/40',
      className,
    )}
    {...props}
  />
);

export const TabsTrigger = ({ className, ...props }: TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'rounded-ds-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus data-[state=active]:bg-primary/10 data-[state=active]:text-primary',
      className,
    )}
    {...props}
  />
);

export const TabsContent = ({ className, ...props }: TabsContentProps) => (
  <TabsPrimitive.Content className={cn('mt-4', className)} {...props} />
);

export type { TabsListProps, TabsTriggerProps, TabsContentProps } from '@radix-ui/react-tabs';

export default Tabs;
