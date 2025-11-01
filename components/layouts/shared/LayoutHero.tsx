import * as React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import {
  LayoutQuickNav,
  type LayoutQuickNavProps,
} from '@/components/layouts/shared/LayoutQuickNav';

export type LayoutHeroAccent =
  | 'marketing'
  | 'auth'
  | 'dashboard'
  | 'learning'
  | 'community'
  | 'marketplace'
  | 'institutions'
  | 'reports'
  | 'admin'
  | 'proctoring'
  | 'neutral';

type AccentTokens = {
  gradient: string;
  ring: string;
  beam: string;
  beamSoft: string;
  icon: string;
  eyebrow: string;
  quickNavBackground: string;
  quickNavBorder: string;
  quickNavActive?: string;
};

const ACCENT_MAP: Record<LayoutHeroAccent, AccentTokens> = {
  marketing: {
    gradient: 'from-sky-400/25 via-sky-300/20 to-indigo-300/10',
    ring: 'ring-sky-400/30',
    beam: 'bg-sky-400/35',
    beamSoft: 'bg-sky-300/25',
    icon: 'bg-white/70 text-sky-700 shadow-[0_8px_30px_rgba(56,189,248,0.25)] dark:bg-white/20 dark:text-sky-200',
    eyebrow: 'text-sky-800/80 dark:text-sky-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/60 dark:border-white/10',
    quickNavActive: 'text-sky-700 dark:text-sky-100',
  },
  auth: {
    gradient: 'from-fuchsia-400/25 via-purple-400/20 to-indigo-400/10',
    ring: 'ring-fuchsia-400/30',
    beam: 'bg-purple-400/35',
    beamSoft: 'bg-fuchsia-300/20',
    icon: 'bg-white/70 text-fuchsia-700 shadow-[0_8px_30px_rgba(192,132,252,0.2)] dark:bg-white/20 dark:text-fuchsia-200',
    eyebrow: 'text-fuchsia-800/80 dark:text-fuchsia-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-fuchsia-600 dark:text-fuchsia-200',
  },
  dashboard: {
    gradient: 'from-emerald-400/20 via-emerald-300/15 to-emerald-300/10',
    ring: 'ring-emerald-400/25',
    beam: 'bg-emerald-400/30',
    beamSoft: 'bg-emerald-300/20',
    icon: 'bg-white/70 text-emerald-700 shadow-[0_8px_30px_rgba(52,211,153,0.25)] dark:bg-white/20 dark:text-emerald-200',
    eyebrow: 'text-emerald-800/80 dark:text-emerald-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-emerald-700 dark:text-emerald-200',
  },
  learning: {
    gradient: 'from-amber-400/25 via-orange-400/15 to-yellow-300/10',
    ring: 'ring-amber-400/25',
    beam: 'bg-orange-400/30',
    beamSoft: 'bg-amber-300/20',
    icon: 'bg-white/70 text-orange-700 shadow-[0_8px_30px_rgba(253,186,116,0.25)] dark:bg-white/20 dark:text-orange-200',
    eyebrow: 'text-orange-800/80 dark:text-amber-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-orange-700 dark:text-amber-200',
  },
  community: {
    gradient: 'from-rose-400/25 via-pink-400/20 to-purple-400/10',
    ring: 'ring-rose-400/25',
    beam: 'bg-rose-400/30',
    beamSoft: 'bg-purple-300/20',
    icon: 'bg-white/70 text-rose-700 shadow-[0_8px_30px_rgba(244,114,182,0.25)] dark:bg-white/20 dark:text-rose-200',
    eyebrow: 'text-rose-800/80 dark:text-rose-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-rose-700 dark:text-rose-200',
  },
  marketplace: {
    gradient: 'from-cyan-400/25 via-sky-400/20 to-emerald-300/10',
    ring: 'ring-cyan-400/25',
    beam: 'bg-cyan-400/30',
    beamSoft: 'bg-emerald-300/20',
    icon: 'bg-white/70 text-cyan-700 shadow-[0_8px_30px_rgba(34,211,238,0.25)] dark:bg-white/20 dark:text-cyan-200',
    eyebrow: 'text-cyan-800/80 dark:text-cyan-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-cyan-700 dark:text-cyan-200',
  },
  institutions: {
    gradient: 'from-indigo-400/25 via-blue-400/20 to-slate-400/10',
    ring: 'ring-indigo-400/25',
    beam: 'bg-indigo-400/30',
    beamSoft: 'bg-blue-300/20',
    icon: 'bg-white/70 text-indigo-700 shadow-[0_8px_30px_rgba(99,102,241,0.25)] dark:bg-white/20 dark:text-indigo-200',
    eyebrow: 'text-indigo-800/80 dark:text-indigo-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-indigo-700 dark:text-indigo-200',
  },
  reports: {
    gradient: 'from-slate-400/25 via-blue-400/15 to-slate-500/10',
    ring: 'ring-slate-400/25',
    beam: 'bg-slate-400/30',
    beamSoft: 'bg-blue-300/20',
    icon: 'bg-white/70 text-slate-700 shadow-[0_8px_30px_rgba(148,163,184,0.25)] dark:bg-white/20 dark:text-slate-200',
    eyebrow: 'text-slate-800/80 dark:text-slate-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-slate-800 dark:text-slate-200',
  },
  admin: {
    gradient: 'from-red-400/25 via-orange-400/20 to-amber-300/10',
    ring: 'ring-red-400/25',
    beam: 'bg-orange-400/30',
    beamSoft: 'bg-red-300/20',
    icon: 'bg-white/70 text-red-700 shadow-[0_8px_30px_rgba(248,113,113,0.25)] dark:bg-white/20 dark:text-red-200',
    eyebrow: 'text-red-800/80 dark:text-red-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-red-700 dark:text-red-200',
  },
  proctoring: {
    gradient: 'from-amber-400/25 via-yellow-300/15 to-slate-900/40',
    ring: 'ring-amber-400/25',
    beam: 'bg-amber-400/30',
    beamSoft: 'bg-slate-900/40',
    icon: 'bg-white/70 text-amber-700 shadow-[0_8px_30px_rgba(251,191,36,0.25)] dark:bg-white/20 dark:text-amber-200',
    eyebrow: 'text-amber-700/80 dark:text-amber-200/80',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-slate-900/60',
    quickNavBorder: 'border-white/50 dark:border-slate-700/60',
    quickNavActive: 'text-amber-700 dark:text-amber-200',
  },
  neutral: {
    gradient: 'from-foreground/10 via-foreground/5 to-background/80',
    ring: 'ring-border/40',
    beam: 'bg-foreground/10',
    beamSoft: 'bg-muted/40',
    icon: 'bg-white/70 text-foreground shadow-[0_8px_30px_rgba(15,23,42,0.12)] dark:bg-white/20 dark:text-white',
    eyebrow: 'text-mutedText',
    quickNavBackground: 'bg-white/70 backdrop-blur dark:bg-white/10',
    quickNavBorder: 'border-white/50 dark:border-white/10',
    quickNavActive: 'text-foreground',
  },
};

export type LayoutHeroProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  accent?: LayoutHeroAccent;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  quickNav?: LayoutQuickNavProps;
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
};

export const LayoutHero: React.FC<LayoutHeroProps> = ({
  title,
  subtitle,
  eyebrow,
  accent = 'neutral',
  icon: Icon,
  actions,
  quickNav,
  children,
  className,
  containerClassName,
}) => {
  const tokens = ACCENT_MAP[accent] ?? ACCENT_MAP.neutral;

  const quickNavProps = React.useMemo(() => {
    if (!quickNav) return null;
    const { className: navClassName, listClassName, itemClassName, defaultActiveClassName, ...rest } = quickNav;
    return {
      ...rest,
      className: clsx(
        'mt-4 flex w-full overflow-x-auto rounded-full border px-1 py-1 text-sm shadow-sm',
        tokens.quickNavBackground,
        tokens.quickNavBorder,
        navClassName
      ),
      listClassName: clsx('flex w-full flex-nowrap gap-2', listClassName),
      itemClassName: clsx(
        'nav-pill flex-1 justify-center px-4 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground',
        itemClassName
      ),
      defaultActiveClassName: defaultActiveClassName ?? tokens.quickNavActive ?? '',
    } satisfies LayoutQuickNavProps;
  }, [quickNav, tokens.quickNavActive, tokens.quickNavBackground, tokens.quickNavBorder]);

  return (
    <section className={clsx('relative pb-6 sm:pb-8', className)}>
      <Container className={clsx('relative', containerClassName)}>
        <div
          className={clsx(
            'relative isolate overflow-hidden rounded-[28px] border border-border/60 bg-background/80 px-6 py-8 shadow-xl ring-1 ring-inset',
            'sm:px-10 sm:py-10',
            'supports-[backdrop-filter]:backdrop-blur-2xl',
            tokens.ring
          )}
        >
          <div className={clsx('absolute inset-0 -z-20 bg-gradient-to-br', tokens.gradient)} />
          <div
            aria-hidden
            className={clsx('pointer-events-none absolute -top-28 right-[-10%] h-60 w-60 rounded-full blur-3xl', tokens.beam)}
          />
          <div
            aria-hidden
            className={clsx('pointer-events-none absolute -bottom-40 left-[-10%] h-72 w-72 rounded-full blur-3xl', tokens.beamSoft)}
          />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {Icon ? (
                  <span
                    className={clsx(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/40 text-2xl shadow-lg',
                      tokens.icon
                    )}
                  >
                    <Icon className="h-7 w-7" aria-hidden />
                  </span>
                ) : null}

                <div className="space-y-3">
                  {eyebrow ? (
                    <span className={clsx('text-xs font-semibold uppercase tracking-[0.3em]', tokens.eyebrow)}>
                      {eyebrow}
                    </span>
                  ) : null}
                  <div className="space-y-2">
                    <h1 className="font-slab text-h3 sm:text-h1">{title}</h1>
                    <p className="max-w-3xl text-base text-mutedText sm:text-lg">{subtitle}</p>
                  </div>
                </div>
              </div>

              {actions ? <div className="flex flex-col gap-3 sm:items-end">{actions}</div> : null}
            </div>

            {children ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div> : null}

            {quickNavProps ? <LayoutQuickNav {...quickNavProps} /> : null}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default LayoutHero;
