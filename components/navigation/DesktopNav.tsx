'use client';

import React from 'react';
import Link from 'next/link';
import { NavLink } from '@/components/design-system/NavLink';
import { UserMenu } from '@/components/design-system/UserMenu';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { StreakChip } from '@/components/user/StreakChip';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import { navigationSchema } from '@/config/navigation';
import { filterNavItems, filterNavSections } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Button } from '@/components/design-system/Button';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

type DesktopNavProps = Omit<React.HTMLAttributes<HTMLElement>, 'role'> & {
  user: UserInfo | null;
  role: string | null;
  ready: boolean;
  streak: number;
  openModules: boolean;
  setOpenModules: (open: boolean) => void;
  modulesRef: React.RefObject<HTMLLIElement>;
  openPractice: boolean;
  setOpenPractice: (open: boolean) => void;
  practiceRef: React.RefObject<HTMLLIElement>;
  signOut: () => Promise<void>;
  showAdmin?: boolean;
  subscriptionTier: SubscriptionTier;
};

export function DesktopNav({
  user,
  role,
  ready,
  streak,
  openModules,
  setOpenModules,
  modulesRef,
  openPractice,
  setOpenPractice,
  practiceRef,
  signOut,
  showAdmin = true,
  subscriptionTier,
  className,
  ...rest
}: DesktopNavProps) {
  const uid = user?.id ?? null;

  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const isTeacher = role === 'teacher';

  const navigationCtx = React.useMemo(
    () => ({ isAuthenticated: Boolean(uid), tier: subscriptionTier }),
    [uid, subscriptionTier]
  );

  const navItemClass =
    'nav-pill text-small font-medium text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  // Teachers: only show Profile in menu; Sign out comes from UserMenu via onSignOut
  const profileMenu = React.useMemo(() => {
    if (isTeacher) {
      return [{ id: 'account', label: 'Profile', href: '/account' }];
    }
    return filterNavItems(navigationSchema.header.profile, navigationCtx);
  }, [isTeacher, navigationCtx]);

  const mainNavItems = React.useMemo(() => {
    if (isTeacher) return [];
    const items = filterNavItems(navigationSchema.header.main, navigationCtx);
    // If authed, hide the "Home" duplicate
    return items.filter((item) => !(item.id === 'home' && uid));
  }, [navigationCtx, isTeacher, uid]);

  const aiToolItems = React.useMemo(() => {
    if (isTeacher) return [];
    return filterNavItems(navigationSchema.header.aiTools, navigationCtx);
  }, [navigationCtx, isTeacher]);

  const headerCta = uid ? null : navigationSchema.header.cta.guest;
  const headerOptional = navigationSchema.header.optional ?? {};

  const aiMenuRef = React.useRef<HTMLDivElement | null>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const practiceMenuRef = React.useRef<HTMLDivElement | null>(null);

  const sidebarSections = React.useMemo(
    () => filterNavSections(navigationSchema.sidebar, navigationCtx),
    [navigationCtx]
  );
  const learningSection = React.useMemo(
    () => sidebarSections.find((section) => section.id === 'learning'),
    [sidebarSections]
  );

  const practiceDropdownItems = React.useMemo(() => {
    const defaults = [
      {
        id: 'practice-home',
        label: 'Practice Home',
        href: '/learning',
        description: 'Open the main practice dashboard.',
      },
      {
        id: 'practice-drills',
        label: 'Quick Drills',
        href: '/learning/drills',
        description: 'Short exercises to sharpen specific skills.',
      },
      {
        id: 'practice-skills',
        label: 'Skills Library',
        href: '/learning/skills',
        description: 'Browse lessons by skill focus and difficulty.',
      },
      {
        id: 'practice-strategies',
        label: 'Strategies & Tips',
        href: '/learning/strategies',
        description: 'Expert guidance for each IELTS module.',
      },
    ];

    const gatedItems = (learningSection?.items ?? []).map((item) => ({
      id: `learning-${item.id}`,
      label: item.label,
      href: item.href,
      description: item.description,
    }));

    const merged = [...defaults, ...gatedItems];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }, [learningSection]);

  React.useEffect(() => {
    if (!openModules) return;
    const firstLink = aiMenuRef.current?.querySelector<HTMLAnchorElement>('a,button');
    firstLink?.focus();
  }, [openModules]);

  React.useEffect(() => {
    if (!openPractice) return;
    const firstLink = practiceMenuRef.current?.querySelector<HTMLAnchorElement>('a,button');
    firstLink?.focus();
  }, [openPractice]);

  return (
    <nav className={className} aria-label="Primary" {...rest}>
      <div className="flex items-center gap-4">
        <ul className="relative flex items-center gap-2">
          {/* Dashboard shortcut for authenticated learners */}
          {uid && !isTeacher && (
            <li>
              <NavLink href="/dashboard" className={navItemClass} label="Dashboard" />
            </li>
          )}

          {/* Teacher role → show only teacher entry */}
          {isTeacher && uid && (
            <li>
              <NavLink href="/teacher" className={navItemClass} label="Teacher" />
            </li>
          )}

          {!isTeacher &&
            mainNavItems.map((item) => {
              if (item.id === 'practice' && practiceDropdownItems.length > 0) {
                return (
                  <li key={item.id} className="relative" ref={practiceRef}>
                    <button
                      onClick={() => {
                        const next = !openPractice;
                        setOpenPractice(next);
                        if (!next) return;
                        setOpenModules(false);
                      }}
                      className={`nav-pill gap-2 text-small font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${openPractice ? 'is-active' : ''}`}
                      aria-haspopup="menu"
                      aria-expanded={openPractice}
                      aria-controls="practice-menu"
                    >
                      <span>{item.label}</span>
                      <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path d={openPractice ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                      </svg>
                    </button>
                    {openPractice && (
                      <div
                        id="practice-menu"
                        ref={practiceMenuRef}
                        className="absolute left-0 top-full z-50 mt-3 w-[18rem] rounded-xl border border-border bg-card p-3 shadow-xl"
                        role="menu"
                      >
                        <ul className="space-y-1">
                          {practiceDropdownItems.map((link) => (
                            <li key={link.id}>
                              <Link
                                href={link.href}
                                className="flex items-start gap-2 rounded-lg px-3 py-2 text-left text-small hover:bg-muted"
                                onClick={() => setOpenPractice(false)}
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-foreground">{link.label}</span>
                                  {link.description && (
                                    <span className="text-xs text-muted-foreground">{link.description}</span>
                                  )}
                                </div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <NavLink href={item.href} className={navItemClass} label={item.label} />
                </li>
              );
            })}

          {/* AI & Tools: gated by subscription tier + feature flags via filterNavItems */}
          {!isTeacher && aiToolItems.length > 0 && (
            <li className="relative" ref={modulesRef}>
              <button
                ref={menuButtonRef}
                onClick={() => {
                  const next = !openModules;
                  setOpenModules(next);
                  if (next) {
                    setOpenPractice(false);
                  }
                }}
                className={`nav-pill gap-2 text-small font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${openModules ? 'is-active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={openModules}
                aria-controls="ai-tools-menu"
              >
                <span>AI &amp; Tools</span>
                <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d={openModules ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                </svg>
              </button>
              {openModules && (
                <div
                  id="ai-tools-menu"
                  ref={aiMenuRef}
                  className="absolute right-0 top-full z-50 mt-3 w-64 rounded-xl border border-border bg-card p-3 shadow-xl"
                  role="menu"
                >
                  <ul className="space-y-1">
                    {aiToolItems.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="flex items-start gap-2 rounded-lg px-3 py-2 text-left text-small hover:bg-muted"
                          onClick={() => setOpenModules(false)}
                        >
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto inline-flex items-center rounded-full bg-muted px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          )}

          {canSeePartners && (
            <li>
              <NavLink href="/partners" className={navItemClass} label="Partners" />
            </li>
          )}
          {canSeeAdmin && (
            <li>
              <NavLink href="/admin/partners" className={navItemClass} label="Admin" />
            </li>
          )}

          {headerCta && (
            <li>
              <Link href={headerCta.href} className="hidden lg:block">
                <Button variant="primary" className="shadow-lg">
                  {headerCta.label}
                </Button>
              </Link>
            </li>
          )}
        </ul>

        {/* Right cluster */}
        <ul className="flex items-center gap-2">
          <li>
          <StreakChip value={streak} href="/profile/streak" className="shrink-0" />
          </li>
          {headerOptional.notifications && (
            <li>
              <NotificationBell />
            </li>
          )}
          {headerOptional.themeToggle && (
            <li>
              <IconOnlyThemeToggle />
            </li>
          )}

          <li className="ml-1">
            {ready ? (
              uid ? (
                <UserMenu
                  userId={uid}
                  email={user?.email ?? undefined}
                  avatarUrl={user?.avatarUrl ?? undefined}
                  onSignOut={signOut}
                  isAdmin={role === 'admin'}
                  items={profileMenu.map((link) => ({
                    id: link.id,
                    label: link.label,
                    href: link.href,
                  }))}
                />
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full px-4 py-2 font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  Sign in
                </Link>
              )
            ) : (
              <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}
