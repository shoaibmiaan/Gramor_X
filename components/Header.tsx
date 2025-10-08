// components/Header.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/components/design-system/Container';
import { DesktopNav } from '@/components/navigation/DesktopNav';
import { MobileNav } from '@/components/navigation/MobileNav';
import { Button } from '@/components/design-system/Button';
import { useHeaderState } from '@/components/hooks/useHeaderState';
import { useUserContext } from '@/context/UserContext';
import { PremiumRoomManager } from '@/premium-ui/access/roomUtils';

export const Header: React.FC<{ streak?: number }> = ({ streak }) => {
  const [openDesktopModules, setOpenDesktopModules] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, role, loading } = useUserContext();
  const { streak: streakState, ready, signOut, subscriptionTier } = useHeaderState(streak);

  // Check if user has access to any premium rooms
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [premiumRooms, setPremiumRooms] = useState<string[]>([]);

  useEffect(() => {
    const checkPremiumAccess = () => {
      const accessedRooms = PremiumRoomManager.getAccessList();
      setHasPremiumAccess(accessedRooms.length > 0);
      setPremiumRooms(accessedRooms.map(room => room.roomName));
    };

    checkPremiumAccess();
    
    // Listen for storage changes to update premium access status
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
    <header
      role="banner"
      className={[
        'relative sticky top-0 z-50 w-full border-b transition-[background,box-shadow,border-color] duration-300',
        'supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:bg-background/70',
        solidHeader
          ? 'bg-background/95 border-border shadow-[0_16px_45px_-30px_rgba(67,97,238,0.55)] dark:shadow-[0_16px_45px_-30px_rgba(128,255,219,0.35)]'
          : 'header-glass border-border/40 dark:border-vibrantPurple/30',
        'before:content-[""] before:absolute before:inset-x-0 before:bottom-0 before:h-[2px]',
        'before:bg-gradient-to-r before:from-vibrantPurple/60 before:via-electricBlue/60 before:to-neonGreen/60',
      ].join(' ')}
    >
      <Container>
        <div className="relative flex items-center justify-between py-2.5 md:py-3.5">
          <Link
            href={user?.id ? '/dashboard' : '/'}
            className="group flex items-center gap-3 rounded-ds focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Go to home"
          >
            <span className="relative inline-flex items-center justify-center rounded-xl bg-card/90 shadow-sm ring-1 ring-border transition group-hover:ring-primary/40 dark:bg-dark/70">
              <span className="relative h-9 w-9 overflow-hidden rounded-lg md:h-10 md:w-10">
                <Image
                  src="/brand/logo.png"
                  alt="GramorX logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                  priority
                />
              </span>
              <span aria-hidden className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-accent/90 ring-2 ring-card" />
            </span>
            <p className="leading-none font-slab text-h2 font-bold md:text-h1" role="heading" aria-level={1}>
              <span className="text-gradient-primary transition-opacity group-hover:opacity-90">GramorX</span>
            </p>
          </Link>

          <div className="flex items-center gap-3">
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

            {user?.id && role && role !== 'guest' && (
              <span
                aria-label={`Role: ${role}`}
                className="rounded-ds bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border"
              >
                {role}
              </span>
            )}

            {/* Premium Room Access Button */}
            {user?.id && (
              <div className="relative group">
                {hasPremiumAccess ? (
                  <div className="flex items-center gap-2">
                    <Button asChild variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0">
                      <Link href="/premium-room">
                        <span className="flex items-center gap-2">
                          <span>⭐</span>
                          <span>Premium Room</span>
                        </span>
                      </Link>
                    </Button>
                    {/* Premium Access Indicator */}
                    <div className="hidden group-hover:block absolute top-full right-0 mt-2 w-48 z-50">
                      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                        <div className="text-xs font-medium text-green-600 mb-1">Premium Access Active</div>
                        <div className="text-xs text-muted-foreground">
                          Access to {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''}
                        </div>
                        <button
                          onClick={handleClearPremiumAccess}
                          className="text-xs text-red-500 hover:text-red-700 mt-2"
                        >
                          Clear All Access
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/premium/pin">
                      <span className="flex items-center gap-2">
                        <span>🔒</span>
                        <span>Enter Premium</span>
                      </span>
                    </Link>
                  </Button>
                )}
              </div>
            )}

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
  );
};