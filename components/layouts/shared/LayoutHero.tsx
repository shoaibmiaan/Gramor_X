import * as React from 'react';
import clsx from 'clsx';
import { Container } from '@/components/design-system/Container';

const ACCENT_THEME = {
  primary: {
    gradient: 'from-primary/15 via-electricBlue/10 to-transparent dark:from-primaryDark/20 dark:via-electricBlue/10',
    halo: 'bg-primary/30 dark:bg-primary/20',
    badge: 'bg-background/80 text-primary ring-primary/30 dark:text-electricBlue',
    highlight: 'border-primary/30 bg-background/80',
  },
  marketing: {
    gradient: 'from-vibrantPurple/25 via-electricBlue/15 to-transparent dark:from-primaryDark/30 dark:via-electricBlue/15',
    halo: 'bg-vibrantPurple/30 dark:bg-primary/25',
    badge: 'bg-background/80 text-vibrantPurple ring-vibrantPurple/30 dark:text-electricBlue',
    highlight: 'border-vibrantPurple/30 bg-background/85',
  },
  dashboard: {
    gradient: 'from-primary/20 via-electricBlue/15 to-transparent dark:from-primaryDark/25 dark:via-electricBlue/15',
    halo: 'bg-primary/25 dark:bg-primary/20',
    badge: 'bg-background/80 text-primary ring-primary/30',
    highlight: 'border-primary/30 bg-background/85',
  },
  learning: {
    gradient: 'from-neonGreen/25 via-electricBlue/10 to-transparent dark:from-neonGreen/20 dark:via-electricBlue/10',
    halo: 'bg-neonGreen/30 dark:bg-neonGreen/20',
    badge: 'bg-background/80 text-neonGreen ring-neonGreen/30',
    highlight: 'border-neonGreen/30 bg-background/85',
  },
  community: {
    gradient: 'from-accent/25 via-electricBlue/10 to-transparent dark:from-accent/25 dark:via-electricBlue/15',
    halo: 'bg-accent/35 dark:bg-accent/25',
    badge: 'bg-background/80 text-accent ring-accent/30',
    highlight: 'border-accent/30 bg-background/85',
  },
  marketplace: {
    gradient: 'from-goldenYellow/30 via-sunsetOrange/20 to-transparent dark:from-sunsetOrange/25 dark:via-goldenYellow/20',
    halo: 'bg-goldenYellow/35 dark:bg-sunsetOrange/25',
    badge: 'bg-background/80 text-sunsetOrange ring-sunsetOrange/30',
    highlight: 'border-sunsetOrange/30 bg-background/85',
  },
  institutions: {
    gradient: 'from-electricBlue/25 via-primary/15 to-transparent dark:from-electricBlue/30 dark:via-primary/20',
    halo: 'bg-electricBlue/30 dark:bg-primary/25',
    badge: 'bg-background/80 text-electricBlue ring-electricBlue/30',
    highlight: 'border-electricBlue/30 bg-background/85',
  },
  reports: {
    gradient: 'from-electricBlue/25 via-purpleVibe/20 to-transparent dark:from-primaryDark/30 dark:via-purpleVibe/20',
    halo: 'bg-electricBlue/25 dark:bg-purpleVibe/25',
    badge: 'bg-background/80 text-electricBlue ring-electricBlue/30',
    highlight: 'border-electricBlue/25 bg-background/85',
  },
  admin: {
    gradient: 'from-primaryDark/30 via-nightMid/40 to-transparent dark:from-nightMid/50 dark:via-nightEnd/30',
    halo: 'bg-primaryDark/35 dark:bg-nightMid/35',
    badge: 'bg-background/80 text-primary ring-primary/25 dark:text-electricBlue',
    highlight: 'border-primary/30 bg-background/85',
  },
  proctoring: {
    gradient: 'from-danger/25 via-warning/15 to-transparent dark:from-danger/30 dark:via-warning/20',
    halo: 'bg-danger/30 dark:bg-warning/25',
    badge: 'bg-background/80 text-danger ring-danger/30',
    highlight: 'border-danger/30 bg-background/85',
  },
} as const;

export type LayoutHeroAccent = keyof typeof ACCENT_THEME;

export type LayoutHeroProps = {
  accent?: LayoutHeroAccent;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  highlight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function LayoutHero({
  accent = 'primary',
  eyebrow,
  title,
  description,
  actions,
  highlight,
  children,
  className,
}: LayoutHeroProps) {
  const theme = ACCENT_THEME[accent] ?? ACCENT_THEME.primary;

  return (
    <section className={clsx('relative isolate overflow-hidden border-b border-border/60 bg-background/80', className)}>
      <div className="absolute inset-0">
        <div
          aria-hidden
          className={clsx('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90', theme.gradient)}
        />
        <div
          aria-hidden
          className={clsx('pointer-events-none absolute -top-32 right-10 h-72 w-72 rounded-full blur-3xl', theme.halo)}
        />
        <div
          aria-hidden
          className={clsx('pointer-events-none absolute bottom-[-4rem] left-[-3rem] h-80 w-80 rounded-full blur-[120px]', theme.halo)}
        />
      </div>

      <Container className="relative z-10 flex flex-col gap-8 py-10 pt-safe sm:py-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-4">
            {eyebrow ? (
              <span
                className={clsx(
                  'inline-flex w-fit items-center rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] ring-1 ring-inset backdrop-blur-sm',
                  theme.badge
                )}
              >
                {eyebrow}
              </span>
            ) : null}

            <h1 className="font-slab text-balance text-4xl leading-tight text-foreground sm:text-5xl">
              {title}
            </h1>

            {description ? (
              <p className="max-w-xl text-lg text-mutedText sm:text-xl">{description}</p>
            ) : null}

            {actions ? (
              <div className="flex flex-wrap gap-3">{actions}</div>
            ) : null}
          </div>

          {highlight ? (
            <div className="w-full max-w-sm">
              <div
                className={clsx(
                  'relative overflow-hidden rounded-2xl border px-5 py-4 shadow-sm backdrop-blur',
                  theme.highlight
                )}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-14 right-4 h-36 w-36 rounded-full bg-white/10 blur-3xl dark:bg-white/5"
                />
                <div className="relative space-y-3 text-sm text-mutedText">{highlight}</div>
              </div>
            </div>
          ) : null}
        </div>

        {children ? <div className="mt-2">{children}</div> : null}
      </Container>
    </section>
  );
}

export default LayoutHero;
