import * as React from 'react';
import { cn } from '@/lib/utils';

export type CardProps = Readonly<{
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children: React.ReactNode;
  interactive?: boolean; // adds hover/transition
  padding?: "none" | "sm" | "md" | "lg";
  insetBorder?: boolean; // subtle inner border
}>;

const padMap = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
} as const;

export function Card({
  as = "div",
  className,
  children,
  interactive,
  padding = "md",
  insetBorder,
}: CardProps) {
  const Comp = as as any;
  return (
    <Comp
      className={cn(
        'overflow-hidden rounded-ds-2xl border border-border/80 bg-card/60 text-card-foreground shadow-elev-1',
        'backdrop-blur-md transition-colors supports-[backdrop-filter]:bg-card/40 supports-[backdrop-filter]:backdrop-blur-lg',
        insetBorder && 'ring-1 ring-inset ring-border/40',
        interactive && 'transform-gpu transition-transform hover:-translate-y-1 hover:shadow-elev-1',
        padMap[padding],
        className
      )}
    >
      {children}
    </Comp>
  );
}

export type CardHeaderProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn("px-4 py-3 sm:px-6 border-b border-border/60", className)}>
      {children}
    </div>
  );
}

export type CardContentProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

export function CardContent({ className, children }: CardContentProps) {
  return <div className={cn("p-4 sm:p-6", className)}>{children}</div>;
}

export type CardFooterProps = Readonly<{
  className?: string;
  children: React.ReactNode;
}>;

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div className={cn("px-4 py-3 sm:px-6 border-t border-border/60", className)}>
      {children}
    </div>
  );
}
