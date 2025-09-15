'use client';

import React from 'react';
import Link from 'next/link';
import { NavLink } from '@/components/design-system/NavLink';
import { UserMenu } from '@/components/design-system/UserMenu';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { ModuleMenu } from './ModuleMenu';
import { FireStreak } from './FireStreak';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import { NAV, USER_MENU_LINKS } from './constants';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

type DesktopNavProps = Omit<React.HTMLAttributes<HTMLElement>, 'role'> & {
  user: UserInfo;
  /** app/user role, not ARIA role */
  role: string | null;
  ready: boolean;
  streak: number;
  openModules: boolean;
  setOpenModules: (open: boolean) => void;
  modulesRef: React.RefObject<HTMLLIElement>;
  signOut: () => Promise<void>;
  /** Force-hide admin links regardless of role (default true to keep current behavior explicit) */
  showAdmin?: boolean;
};

export function DesktopNav({
  user,
  role,
  ready,
  streak,
  openModules,
  setOpenModules,
  modulesRef,
  signOut,
  showAdmin = true,
  className,
  ...rest
}: DesktopNavProps) {
  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;

  const navItemClass =
    'nav-pill text-small font-medium text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <nav className={className} aria-label="Primary" {...rest}>
      <ul className="relative flex items-center gap-2">
        {user.id && (
          <li>
            <NavLink href="/dashboard" className={navItemClass} label="Dashboard" />
          </li>
        )}

        <ModuleMenu open={openModules} setOpen={setOpenModules} modulesRef={modulesRef} />

        <li>
          <NavLink href="/learning" className={navItemClass} label="Learning" />
        </li>

        {NAV.map((n) => (
          <li key={n.href}>
            <NavLink href={n.href} className={navItemClass} label={n.label} />
          </li>
        ))}

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

        {/* Right cluster */}
        <li className="ml-2">
          <FireStreak value={streak} />
        </li>
        <li>
          <NotificationBell />
        </li>
        <li>
          <IconOnlyThemeToggle />
        </li>

        <li className="ml-1">
          {ready ? (
            user.id ? (
              <UserMenu
                userId={user.id}
                email={user.email}
                avatarUrl={user.avatarUrl}
                onSignOut={signOut}
                items={USER_MENU_LINKS.map((link) => ({
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
    </nav>
  );
}
