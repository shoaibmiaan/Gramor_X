// components/Header.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { DesktopNav } from '@/components/navigation/DesktopNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { useHeaderState } from '@/components/hooks/useHeaderState';
import { useUserContext } from '@/context/UserContext';
import { PremiumRoomManager } from '@/premium-ui/access/roomUtils';
import { cn } from '@/lib/utils';

const ANNOUNCEMENT_KEY = 'gramorx:announcement-dismissed';

export const Header: React.FC<{ streak?: number }> = ({ streak }) => {
  const [openDesktopModules, setOpenDesktopModules] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const { user, role, loading } = useUserContext();
  const { streak: streakState, ready, signOut, subscriptionTier } = useHeaderState(streak);

  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [premiumRooms, setPremiumRooms] = useState<string[]>([]);

  useEffect(() => {
    const checkPremiumAccess = () => {
      const accessedRooms = PremiumRoomManager.getAccessList();
      setHasPremiumAccess(accessedRooms.length > 0);
      setPremiumRooms(accessedRooms.map((room) => room.roomName));
    };

    checkPremiumAccess();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'premiumRooms') {
        checkPremiumAccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(ANNOUNCEMENT_KEY);
      if (stored === '1') setAnnouncementVisible(false);
    } catch (err) {
      console.warn('Unable to read announcement dismissal state', err);
    }
  }, []);

  const solidHeader = scrolled || openDesktopModules || mobileOpen;

  const modulesRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (modulesRef.current && !modulesRef.current.contains(t)) setOpenDesktopModules(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDesktopModules(false);
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

  const dismissAnnouncement = () => {
    setAnnouncementVisible(false);
    try {
      window.localStorage.setItem(ANNOUNCEMENT_KEY, '1');
    } catch (err) {
      console.warn('Unable to persist announcement dismissal', err);
    }
  };

  const handleClearPremiumAccess = () => {
    PremiumRoomManager.clearAllAccess();
    setHasPremiumAccess(false);
    setPremiumRooms([]);
  };

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
    <>
      {announcementVisible ? (
        <div className="relative z-[60] w-full border-b border-primary/20 bg-gradient-to-r from-electricBlue/15 via-primary/10 to-purpleVibe/20 text-sm text-foreground dark:from-dark/80 dark:via-dark/75 dark:to-dark/80">
          <Container>
            <div className="flex flex-col gap-3 py-2.5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="flex flex-1 items-center justify-center gap-2 text-sm font-medium text-electricBlue sm:justify-start">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-electricBlue/15 text-electricBlue">
                  <Icon name="Rocket" size={16} />
                </span>
                <span>
                  IELTS Mission Control is now in private beta. <span className="font-semibold">Request early access</span>
                </span>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <Button
                  href="/roadmap"
                  variant="soft"
                  tone="info"
                  size="sm"
                  fullWidth
                  className="sm:w-auto"
                >
                  View roadmap
                </Button>
                <Button
                  href="/waitlist"
                  size="sm"
                  variant="primary"
                  fullWidth
                  className="shadow-sm sm:w-auto"
                >
                  Claim invite
                </Button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-full p-1 text-muted-foreground transition hover:text-foreground"
                  onClick={dismissAnnouncement}
                  aria-label="Dismiss announcement"
                >
                  <Icon name="X" size={16} />
                </button>
              </div>
            </div>
          </Container>
        </div>
      ) : null}

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
              <span className="ml-3 hidden items-center rounded-full border border-electricBlue/40 bg-electricBlue/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-electricBlue sm:inline-flex">
                Beta
              </span>
            </Link>

            <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3 lg:gap-4">
              <DesktopNav
                user={user}
                role={role ?? 'guest'}
                ready={ready}
                streak={streakState}
                openModules={openDesktopModules}
                setOpenModules={setOpenDesktopModules}
                modulesRef={modulesRef}
                signOut={signOut}
                showAdmin={false}
                className="hidden items-center gap-2 will-change-transform transition-[opacity,transform] duration-200 lg:flex data-[solid=true]:opacity-100 data-[solid=false]:opacity-95"
                data-solid={solidHeader}
                hasPremiumAccess={hasPremiumAccess}
                premiumRooms={premiumRooms}
                onClearPremiumAccess={handleClearPremiumAccess}
                subscriptionTier={subscriptionTier}
              />

              {!user?.id ? (
                <Button
                  href="/waitlist"
                  variant="soft"
                  tone="primary"
                  size="sm"
                  leadingIcon={<Icon name="Sparkles" size={16} />}
                  fullWidth
                  className="order-10 w-full font-semibold sm:order-none sm:w-auto"
                >
                  Join waitlist
                </Button>
              ) : null}

              {user?.id && hasPremiumAccess ? (
                <div className="relative group">
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="border-border/60 bg-background/70 text-foreground hover:bg-background"
                    >
                      <Link href="/premium-room">
                        <span className="flex items-center gap-2 text-sm">
                          <span aria-hidden>⭐</span>
                          <span>Premium room</span>
                        </span>
                      </Link>
                    </Button>
                    <div className="absolute right-0 top-full z-50 mt-2 hidden w-48 rounded-xl border border-border/60 bg-card/95 p-3 text-left shadow-lg shadow-black/5 backdrop-blur group-hover:block">
                      <div className="text-xs font-medium text-emerald-500">Premium access active</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Access to {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''}
                      </div>
                      <button
                        onClick={handleClearPremiumAccess}
                        className="mt-2 text-xs font-medium text-red-500 transition-colors hover:text-red-600"
                      >
                        Clear all access
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

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
                hasPremiumAccess={hasPremiumAccess}
                premiumRooms={premiumRooms}
                onClearPremiumAccess={handleClearPremiumAccess}
                subscriptionTier={subscriptionTier}
              />
            </div>
          </div>
        </Container>

        <span className="sr-only" aria-live="polite">
          {typeof streakState === 'number' ? `Current streak ${streakState} days` : ''}
          {hasPremiumAccess ? `Premium access active for ${premiumRooms.length} rooms` : ''}
        </span>
      </header>
    </>
  );
};

export default Header;
