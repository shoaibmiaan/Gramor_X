// components/navigation/HeaderMini.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

import { Container } from '@/components/design-system/Container';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/context/UserContext';

type HeaderMiniProps = {
  /** Optional custom title under GramorX */
  title?: string;
  /** Optional smaller subtitle line */
  subtitle?: string;
  /** If you want to lock exam start from outside (ms, Date.now()). Otherwise it uses mount time. */
  examStartTime?: number;
  /** Seconds after which idle text turns red */
  idleThresholdSec?: number;
  /** Optional back link (e.g. /mock) */
  backHref?: string;
};

const formatMmSs = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const buildCandidateId = (raw?: string | null): string => {
  if (!raw) return 'GX-GUEST';
  if (raw.includes('@')) {
    const local = raw.split('@')[0];
    const suffix = local.slice(-6).toUpperCase();
    return `GX-${suffix}`;
  }
  const cleaned = raw.replace(/-/g, '');
  return `GX-${cleaned.slice(0, 8).toUpperCase()}`;
};

const HeaderMini: React.FC<HeaderMiniProps> = ({
  title = 'Mock Exam Room',
  subtitle,
  examStartTime,
  idleThresholdSec = 60,
  backHref,
}) => {
  const { user } = useUserContext();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [idleMs, setIdleMs] = React.useState(0);

  const [start] = React.useState(() => examStartTime ?? Date.now());
  const lastActiveRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Tick clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Idle detection
  React.useEffect(() => {
    const markActive = () => {
      lastActiveRef.current = Date.now();
      setIdleMs(0);
    };

    const measureIdle = () => {
      const delta = Date.now() - lastActiveRef.current;
      setIdleMs(delta);
    };

    window.addEventListener('mousemove', markActive);
    window.addEventListener('keydown', markActive);
    window.addEventListener('click', markActive);

    const idleTimer = setInterval(measureIdle, 1000);

    return () => {
      window.removeEventListener('mousemove', markActive);
      window.removeEventListener('keydown', markActive);
      window.removeEventListener('click', markActive);
      clearInterval(idleTimer);
    };
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - start) / 1000));
  const idleSec = Math.floor(idleMs / 1000);
  const idleWarning = idleSec >= idleThresholdSec;

  const candidateId = buildCandidateId(user?.id ?? user?.email ?? null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/90 backdrop-blur-xl">
      {/* a11y skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4
                   focus:rounded-full focus:bg-accent focus:px-3 focus:py-1
                   focus:text-accent-foreground"
      >
        Skip to content
      </a>

      <Container>
        <div className="flex h-14 items-center justify-between gap-3">
          {/* LEFT: Back + logo + labels */}
          <div className="flex min-w-0 items-center gap-2">
            {backHref && (
              <Link href={backHref} aria-label="Go back">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon name="ChevronLeft" size={16} />
                </button>
              </Link>
            )}

            <Link
              href={user?.id ? '/dashboard' : '/'}
              aria-label="Go to GramorX home"
              className="group flex min-w-0 items-center gap-2"
            >
              <Image
                src="/brand/logo.png"
                alt="GramorX logo"
                width={28}
                height={28}
                className="rounded-xl"
              />

              <div className="flex min-w-0 flex-col leading-tight">
                <span className="bg-gradient-to-r from-electricBlue to-purpleVibe bg-clip-text text-sm font-bold text-transparent">
                  GramorX
                </span>

                <span className="truncate text-[11px] font-medium text-muted-foreground">
                  {title}
                </span>

                {subtitle && (
                  <span className="truncate text-[10px] font-medium text-muted-foreground/80">
                    {subtitle}
                  </span>
                )}
              </div>

              <Badge
                variant="outline"
                size="xs"
                className="hidden border-electricBlue/30 text-[10px] font-semibold uppercase tracking-wide text-electricBlue sm:inline-flex"
              >
                MOCK
              </Badge>
            </Link>
          </div>

          {/* RIGHT: Candidate + timers + theme */}
          <div className="flex items-center gap-4">
            {/* Candidate ID */}
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Candidate ID
              </span>
              <span className="text-xs font-mono font-bold tracking-wide text-foreground">
                {candidateId}
              </span>
            </div>

            {/* Time spent */}
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Time in room
              </span>
              <span className="text-xs font-semibold text-primary">
                {formatMmSs(elapsedSec)}
              </span>
            </div>

            {/* Idle time */}
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-[10px] font-semibold text-muted-foreground">
                Idle time
              </span>
              <span
                className={cn(
                  'text-xs font-semibold',
                  idleWarning ? 'text-danger' : 'text-muted-foreground',
                )}
              >
                {idleSec}s
              </span>
            </div>

            {/* Theme toggle */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground shadow-sm transition hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
              </button>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
};

export default HeaderMini;
