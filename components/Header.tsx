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
import type { User } from '@supabase/supabase-js';

interface NavUserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

const mapUserToNavUser = (user: User | null): NavUserInfo => {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    name: typeof metadata['full_name'] === 'string' ? (metadata['full_name'] as string) : null,
    avatarUrl: typeof metadata['avatar_url'] === 'string' ? (metadata['avatar_url'] as string) : null,
  };
};

export const Header: React.FC<{ streak?: number }> = ({ streak }) => {
  const [openDesktopModules, setOpenDesktopModules] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, role, loading } = useUserContext();
  const { streak: streakState, signOut } = useHeaderState(streak);
  const [navUser, setNavUser] = useState<NavUserInfo>(() => mapUserToNavUser(user));

  useEffect(() => {
    setNavUser(mapUserToNavUser(user));
  }, [user]);

  useEffect(() => {
    const onAvatarChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ url: string }>;
      const nextUrl = customEvent.detail?.url;
      if (typeof nextUrl === 'string') {
        setNavUser((current) => ({ ...current, avatarUrl: nextUrl }));
      }
    };
    window.addEventListener('profile:avatar-changed', onAvatarChanged as EventListener);
    return () => window.removeEventListener('profile:avatar-changed', onAvatarChanged as EventListener);
  }, []);

  const navigationReady = !loading;

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

  if (loading) {
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
              user={navUser}
              role={role ?? 'guest'}
              ready={navigationReady}
              streak={streakState}
              openModules={openDesktopModules}
              setOpenModules={setOpenDesktopModules}
              modulesRef={modulesRef}
              signOut={signOut}
              showAdmin={false}
              className="hidden items-center gap-2 will-change-transform transition-[opacity,transform] duration-200 lg:flex data-[solid=true]:opacity-100 data-[solid=false]:opacity-95"
              data-solid={solidHeader}
            />

            {user?.id && role && role !== 'guest' && (
              <span
                aria-label={`Role: ${role}`}
                className="rounded-ds bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border"
              >
                {role}
              </span>
            )}

            {user?.id && (
              <Button asChild>
                <Link href="/premium-pin">Premium PIN</Link>
              </Button>
            )}

            <MobileNav
              user={navUser}
              role={role ?? 'guest'}
              ready={navigationReady}
              streak={streakState}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              mobileModulesOpen={mobileModulesOpen}
              setMobileModulesOpen={setMobileModulesOpen}
              signOut={signOut}
              showAdmin={false}
              className="lg:hidden"
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