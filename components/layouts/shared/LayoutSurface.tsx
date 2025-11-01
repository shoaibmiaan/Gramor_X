import * as React from 'react';
import clsx from 'clsx';
import { Container } from '@/components/design-system/Container';
import type { LayoutHeroAccent } from './LayoutHero';

const SURFACE_THEME: Record<LayoutHeroAccent, { glow: string; border: string; background: string }> = {
  primary: {
    glow: 'bg-primary/15 dark:bg-primary/10',
    border: 'border-primary/20',
    background: 'bg-card/80',
  },
  marketing: {
    glow: 'bg-vibrantPurple/15 dark:bg-vibrantPurple/10',
    border: 'border-vibrantPurple/25',
    background: 'bg-card/80',
  },
  dashboard: {
    glow: 'bg-primary/15 dark:bg-primary/10',
    border: 'border-primary/25',
    background: 'bg-card/85',
  },
  learning: {
    glow: 'bg-neonGreen/15 dark:bg-neonGreen/10',
    border: 'border-neonGreen/20',
    background: 'bg-card/85',
  },
  community: {
    glow: 'bg-accent/15 dark:bg-accent/10',
    border: 'border-accent/20',
    background: 'bg-card/85',
  },
  marketplace: {
    glow: 'bg-goldenYellow/15 dark:bg-sunsetOrange/10',
    border: 'border-sunsetOrange/25',
    background: 'bg-card/85',
  },
  institutions: {
    glow: 'bg-electricBlue/15 dark:bg-electricBlue/10',
    border: 'border-electricBlue/20',
    background: 'bg-card/85',
  },
  reports: {
    glow: 'bg-electricBlue/15 dark:bg-purpleVibe/15',
    border: 'border-electricBlue/20',
    background: 'bg-card/85',
  },
  admin: {
    glow: 'bg-primaryDark/20 dark:bg-nightMid/25',
    border: 'border-primary/25',
    background: 'bg-card/85',
  },
  proctoring: {
    glow: 'bg-danger/15 dark:bg-warning/10',
    border: 'border-danger/25',
    background: 'bg-card/85',
  },
};

export type LayoutSurfaceProps = {
  children: React.ReactNode;
  accent?: LayoutHeroAccent;
  className?: string;
  paddingClassName?: string;
};

export function LayoutSurface({
  children,
  accent = 'primary',
  className,
  paddingClassName = 'p-6 sm:p-8',
}: LayoutSurfaceProps) {
  const theme = SURFACE_THEME[accent] ?? SURFACE_THEME.primary;

  return (
    <Container className={clsx('relative py-8 sm:py-10', className)}>
      <div
        className={clsx(
          'relative overflow-hidden rounded-ds-2xl border backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/30',
          theme.border,
          theme.background
        )}
      >
        <div
          aria-hidden
          className={clsx('pointer-events-none absolute -top-24 right-12 h-64 w-64 rounded-full blur-3xl', theme.glow)}
        />
        <div
          aria-hidden
          className={clsx('pointer-events-none absolute bottom-[-5rem] left-10 h-72 w-72 rounded-full blur-[110px]', theme.glow)}
        />
        <div className={clsx('relative', paddingClassName)}>{children}</div>
      </div>
    </Container>
  );
}

export default LayoutSurface;
