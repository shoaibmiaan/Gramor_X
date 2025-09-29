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
  user: UserInfo | null;
  role: string | null;
  ready: boolean;
  streak: number;
  openModules: boolean;
  setOpenModules: (open: boolean) => void;
  modulesRef: React.RefObject<HTMLLIElement>;
  signOut: () => Promise<void>;
  showAdmin?: boolean;
  hasPremiumAccess?: boolean;
  premiumRooms?: string[];
  onClearPremiumAccess?: () => void;
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
  hasPremiumAccess = false,
  premiumRooms = [],
  onClearPremiumAccess,
  className,
  ...rest
}: DesktopNavProps) {
  const uid = user?.id ?? null;
  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const isTeacher = role === 'teacher';

  const navItemClass =
    'nav-pill text-small font-medium text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  // Teachers: only show Profile in menu; Sign out comes from UserMenu via onSignOut
  const menuItems = isTeacher
    ? [{ id: 'account', label: 'Profile', href: '/account' }]
    : USER_MENU_LINKS;

  // Add premium access info to menu items if user has premium access
  const enhancedMenuItems = hasPremiumAccess ? [
    ...menuItems,
    {
      id: 'premium-status',
      label: `⭐ Premium Access (${premiumRooms.length} rooms)`,
      href: '/premium-room',
      isPremium: true
    }
  ] : menuItems;

  return (
    <nav className={className} aria-label="Primary" {...rest}>
      <ul className="relative flex items-center gap-2">
        {/* Dashboard only if logged in and not teacher */}
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

        {/* Hide module/learning/global nav for teacher */}
        {!isTeacher && (
          <ModuleMenu open={openModules} setOpen={setOpenModules} modulesRef={modulesRef} />
        )}

        {!isTeacher && (
          <li>
            <NavLink href="/learning" className={navItemClass} label="Learning" />
          </li>
        )}

        {!isTeacher &&
          NAV.map((n) => (
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

        {/* Premium Access Status */}
        {hasPremiumAccess && (
          <li className="relative group">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium">
              <span>⭐</span>
              <span>Premium</span>
            </div>
            {/* Premium Access Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-48 z-50 hidden group-hover:block">
              <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                <div className="text-xs font-medium text-green-600 mb-1">Premium Access Active</div>
                <div className="text-xs text-muted-foreground mb-2">
                  Access to {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''}
                </div>
                {premiumRooms.length > 0 && (
                  <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {premiumRooms.slice(0, 3).map((room, index) => (
                      <div key={index} className="truncate">• {room}</div>
                    ))}
                    {premiumRooms.length > 3 && (
                      <div className="text-xs">+{premiumRooms.length - 3} more</div>
                    )}
                  </div>
                )}
                {onClearPremiumAccess && (
                  <button
                    onClick={onClearPremiumAccess}
                    className="text-xs text-red-500 hover:text-red-700 mt-2"
                  >
                    Clear All Access
                  </button>
                )}
              </div>
            </div>
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
            uid ? (
              <UserMenu
                userId={uid}
                email={user?.email ?? undefined}
                avatarUrl={user?.avatarUrl ?? undefined}
                onSignOut={signOut}
                isAdmin={role === 'admin'}
                items={enhancedMenuItems.map((link) => ({
                  id: link.id,
                  label: link.label,
                  href: link.href,
                  isPremium: link.isPremium || false
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