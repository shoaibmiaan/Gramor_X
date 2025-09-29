'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Container } from '@/components/design-system/Container';
import { NavLink } from '@/components/design-system/NavLink';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { FireStreak } from './FireStreak';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import { MODULE_LINKS, NAV, USER_MENU_LINKS } from './constants';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

type MobileNavProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> & {
  user: UserInfo;
  role: string | null;
  ready: boolean;
  streak: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  mobileModulesOpen: boolean;
  setMobileModulesOpen: (open: boolean) => void;
  signOut: () => Promise<void>;
  showAdmin?: boolean;
  hasPremiumAccess?: boolean;
  premiumRooms?: string[];
  onClearPremiumAccess?: () => void;
}

export function MobileNav({
  user,
  role,
  ready,
  streak,
  mobileOpen,
  setMobileOpen,
  mobileModulesOpen,
  setMobileModulesOpen,
  signOut,
  showAdmin = true,
  hasPremiumAccess = false,
  premiumRooms = [],
  onClearPremiumAccess,
  className,
  ...rest
}: MobileNavProps) {
  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const mobileItemClass = 'block rounded-lg px-3 py-3 hover:bg-muted';

  const closeMenu = React.useCallback(() => setMobileOpen(false), [setMobileOpen]);

  const overlay = (
    <div
      className={`
        fixed inset-0 z-40 md:hidden bg-black/40 transition-opacity
        ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
      `}
      onClick={() => setMobileOpen(false)}
      aria-hidden="true"
    />
  );

  const panel = mobileOpen ? (
    <div
      className={`
        fixed inset-x-0 top-0 z-50 md:hidden
        border-b border-border bg-background shadow-lg
        animate-in slide-in-from-top-2 duration-150
        ${className ?? ''}
      `}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      {...rest}
    >
      <Container>
        <div className="flex items-center justify-between py-3">
          <FireStreak value={streak} />
          {ready && user && user.id ? (
            <button
              onClick={signOut}
              className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
            >
              Sign out
            </button>
          ) : ready ? (
            <Link
              href="/login"
              className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
              onClick={() => setMobileOpen(false)}
            >
              Sign in
            </Link>
          ) : (
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted" />
          )}
        </div>

        {/* Premium Access Status */}
        {hasPremiumAccess && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-200/20">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
              <span>⭐</span>
              <span>Premium Access Active</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''} available
            </div>
            {onClearPremiumAccess && (
              <button
                onClick={() => {
                  onClearPremiumAccess();
                  setMobileOpen(false);
                }}
                className="text-xs text-red-500 hover:text-red-700 mt-2"
              >
                Clear All Access
              </button>
            )}
          </div>
        )}

        <nav className="pb-4">
          <ul className="flex flex-col gap-1">
            {user && user.id && (
              <li>
                <NavLink
                  href="/dashboard"
                  className={mobileItemClass}
                  onClick={closeMenu}
                >
                  Dashboard
                </NavLink>
              </li>
            )}

            {/* Premium Room Link */}
            {hasPremiumAccess && (
              <li>
                <NavLink
                  href="/premium-room"
                  className={`${mobileItemClass} bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-200/20`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center gap-2">
                    <span>⭐</span>
                    <span>Premium Room</span>
                  </span>
                </NavLink>
              </li>
            )}

            {/* Premium PIN Link for non-premium users */}
            {user && user.id && !hasPremiumAccess && (
              <li>
                <NavLink
                  href="/premium-pin"
                  className={`${mobileItemClass} border border-primary/20`}
                  onClick={closeMenu}
                >
                  <span className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>Enter Premium</span>
                  </span>
                </NavLink>
              </li>
            )}

            <li>
              <NavLink
                href="/learning"
                className={mobileItemClass}
                onClick={closeMenu}
              >
                Learning
              </NavLink>
            </li>

            <li>
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 hover:bg-muted"
                onClick={() => setMobileModulesOpen(!mobileModulesOpen)}
                aria-expanded={mobileModulesOpen}
                aria-controls="mobile-modules-list"
              >
                <span className="font-medium">Modules</span>
                <svg
                  className="h-3.5 w-3.5 opacity-80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d={mobileModulesOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                </svg>
              </button>

              {mobileModulesOpen && (
                <ul id="mobile-modules-list" className="mt-1 ml-2 overflow-hidden rounded-lg border border-border">
                  {MODULE_LINKS.map((m) => (
                    <li key={m.href}>
                      <NavLink
                        href={m.href}
                        className="block px-4 py-3 hover:bg-muted"
                        onClick={() => {
                          setMobileModulesOpen(false);
                          closeMenu();
                        }}
                      >
                        {m.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {NAV.map((n) => (
              <li key={n.href}>
                <NavLink
                  href={n.href}
                  className={mobileItemClass}
                  onClick={closeMenu}
                >
                  {n.label}
                </NavLink>
              </li>
            ))}

            {canSeePartners && (
              <li>
                <NavLink
                  href="/partners"
                  className={mobileItemClass}
                  onClick={closeMenu}
                >
                  Partners
                </NavLink>
              </li>
            )}
            {canSeeAdmin && (
              <li>
                <NavLink
                  href="/admin/partners"
                  className={mobileItemClass}
                  onClick={closeMenu}
                >
                  Admin
                </NavLink>
              </li>
            )}

            {user && user.id &&
              USER_MENU_LINKS.map((item) => (
                <li key={item.id}>
                  <NavLink href={item.href} className={mobileItemClass} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
          </ul>
        </nav>
      </Container>
    </div>
  ) : null;

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <NotificationBell />
        <IconOnlyThemeToggle />
        <button
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          )}
        </button>
      </div>

      {typeof document !== 'undefined' ? createPortal(<>{overlay}{panel}</>, document.body) : null}
    </>
  );
}