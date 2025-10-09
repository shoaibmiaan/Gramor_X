// components/Header.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { DesktopNav } from '@/components/navigation/DesktopNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { useHeaderState } from '@/components/hooks/useHeaderState';
import { useUserContext } from '@/context/UserContext';
import { cn } from '@/lib/utils';

export const Header: React.FC<{ streak?: number }> = ({ streak }) => {
  const [openDesktopModules, setOpenDesktopModules] = useState(false);
  const [openDesktopPractice, setOpenDesktopPractice] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, role, loading } = useUserContext();
  const { streak: streakState, ready, signOut, subscriptionTier } = useHeaderState(streak);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const solidHeader = scrolled || openDesktopModules || mobileOpen;

  const modulesRef = useRef<HTMLLIElement>(null);
  const practiceRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (modulesRef.current && !modulesRef.current.contains(t)) setOpenDesktopModules(false);
      if (practiceRef.current && !practiceRef.current.contains(t)) setOpenDesktopPractice(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDesktopModules(false);
        setOpenDesktopPractice(false);
        setMobileOpen(false);
        setMobileModulesOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    if (mobileOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('touchmove', preventTouch, { passive: false });
    } else {
      document.documentElement.style.overflow = '';
      document.removeEventListener('touchmove', preventTouch);
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.removeEventListener('touchmove', preventTouch);
    };
  }, [mobileOpen]);

  if (loading && !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 supports-[backdrop-filter]:backdrop-blur-xl">
        <Container>
          <div className="flex items-center justify-between py-2.5 md:py-3.5">
            <div className="h-6 w-40 animate-pulse rounded bg-border" />
            <div className="h-6 w-24 animate-pulse rounded bg-border" />
          </div>
        </Container>
      </header>
    );
  }

  return (
    <header
      role="banner"
      data-solid={solidHeader}
      className={cn(
        'relative sticky top-0 z-50 w-full border-b transition-[background,border-color,box-shadow] duration-500 ease-out',
        'supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:bg-background/60',
        solidHeader
          ? 'bg-background/92 border-border/80 shadow-[0_10px_32px_-24px_rgba(15,23,42,0.35)] dark:shadow-[0_10px_32px_-24px_rgba(2,6,23,0.7)]'
          : 'bg-background/45 border-border/35 shadow-none',
        'after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[radial-gradient(ellipse_at_top,rgba(104,117,245,0.16),transparent_60%)]',
        'after:opacity-0 after:transition-opacity after:duration-700 data-[solid=true]:after:opacity-100'
      )}
    >
      <Container>
        <div className="relative flex items-center justify-between gap-4 py-3.5 md:gap-8 md:py-5">
          <Link
            href={user?.id ? '/dashboard' : '/'}
            className="group flex items-center gap-3 rounded-ds focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Go to home"
          >
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/60 transition group-hover:ring-primary/25">
              <span className="relative h-7 w-7 overflow-hidden rounded-xl md:h-8 md:w-8">
                <Image
                  src="/brand/logo.png"
                  alt="GramorX logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-slab text-[1.45rem] font-semibold leading-tight tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary md:text-[1.65rem]">
                GramorX
              </span>
              <span className="hidden text-[0.75rem] font-medium uppercase tracking-[0.3em] text-muted-foreground/90 transition-colors duration-300 group-hover:text-muted-foreground sm:block">
                Practice, peacefully
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2.5 md:gap-4">
            <DesktopNav
              user={user}
              role={role ?? 'guest'}
              ready={ready}
              streak={streakState}
              openModules={openDesktopModules}
              setOpenModules={setOpenDesktopModules}
              modulesRef={modulesRef}
              openPractice={openDesktopPractice}
              setOpenPractice={setOpenDesktopPractice}
              practiceRef={practiceRef}
              signOut={signOut}
              showAdmin={false}
              className="hidden items-center gap-2 will-change-transform transition-[opacity,transform] duration-200 lg:flex data-[solid=true]:opacity-100 data-[solid=false]:opacity-95"
              data-solid={solidHeader}
              subscriptionTier={subscriptionTier}
            />

            <MobileNav
              user={user}
              role={role ?? 'guest'}
              ready={ready}
              streak={streakState}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              mobileModulesOpen={mobileModulesOpen}
              setMobileModulesOpen={setMobileModulesOpen}
              signOut={signOut}
              showAdmin={false}
              className="lg:hidden"
              subscriptionTier={subscriptionTier}
            />
          </div>
        </div>
      </Container>

      <span className="sr-only" aria-live="polite">
        {typeof streakState === 'number' ? `Current streak ${streakState} days` : ''}
      </span>
    </header>
  );
};