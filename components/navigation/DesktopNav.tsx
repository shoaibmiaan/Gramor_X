'use client';

import React from 'react';
import Link from 'next/link';
import { NavLink } from '@/components/design-system/NavLink';
import { UserMenu } from '@/components/design-system/UserMenu';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { StreakChip } from '@/components/user/StreakChip';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import ModuleMenu from './ModuleMenu';
import { navigationSchema } from '@/config/navigation';
import { filterNavItems } from '@/lib/navigation/utils';
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
  signOut: () => Promise<void>;
  showAdmin?: boolean;
  hasPremiumAccess?: boolean;
  premiumRooms?: string[];
  onClearPremiumAccess?: () => void;
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
  signOut,
  showAdmin = true,
  hasPremiumAccess = false,
  premiumRooms = [],
  onClearPremiumAccess,
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

  const headerCtaConfig = navigationSchema.header.cta ?? {};
  const headerCta = uid ? headerCtaConfig.authed : headerCtaConfig.guest;
  const headerOptional = navigationSchema.header.optional ?? {};

  const [openAiTools, setOpenAiTools] = React.useState(false);
  const aiMenuRef = React.useRef<HTMLDivElement | null>(null);
  const aiButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const aiToolsRef = React.useRef<HTMLLIElement | null>(null);

  React.useEffect(() => {
    if (!openAiTools) return;
    const firstLink = aiMenuRef.current?.querySelector<HTMLAnchorElement>('a,button');
    firstLink?.focus();
  }, [openAiTools]);

  React.useEffect(() => {
    if (!openAiTools) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!aiToolsRef.current?.contains(target)) {
        setOpenAiTools(false);
      }
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenAiTools(false);
        aiButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openAiTools]);

  React.useEffect(() => {
    if (openModules) setOpenAiTools(false);
  }, [openModules]);

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
            mainNavItems.map((item) =>
              item.id === 'practice' ? (
                <ModuleMenu
                  key={item.id}
                  open={openModules}
                  setOpen={setOpenModules}
                  modulesRef={modulesRef}
                  label={item.label}
                />
              ) : (
                <li key={item.id}>
                  <NavLink href={item.href} className={navItemClass} label={item.label} />
                </li>
              )
            )}

          {/* AI & Tools: gated by subscription tier + feature flags via filterNavItems */}
          {!isTeacher && aiToolItems.length > 0 && (
            <li className="relative" ref={aiToolsRef}>
              <button
                ref={aiButtonRef}
                onClick={() => {
                  const next = !openAiTools;
                  if (next) setOpenModules(false);
                  setOpenAiTools(next);
                }}
                className={`nav-pill gap-2 text-small font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${openAiTools ? 'is-active' : ''}`}
                aria-haspopup="menu"
                aria-expanded={openAiTools}
                aria-controls="ai-tools-menu"
              >
                <span>AI &amp; Tools</span>
                <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d={openAiTools ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                </svg>
              </button>
              {openAiTools && (
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
                          onClick={() => setOpenAiTools(false)}
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

          {/* Premium Access Status */}
          {hasPremiumAccess && (
            <li className="relative group">
              <div className="flex items-center gap-1 rounded-full px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-medium">
                <span aria-hidden="true">⭐</span>
                <span>Premium</span>
              </div>
              <div className="absolute top-full right-0 z-50 mt-2 hidden w-56 group-hover:block">
                <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
                  <div className="mb-1 text-xs font-medium text-green-600">Premium Access Active</div>
                  <div className="mb-2 text-xs text-muted-foreground">
                    Access to {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''}
                  </div>
                  {premiumRooms.length > 0 && (
                    <div className="max-h-20 overflow-y-auto text-xs text-muted-foreground">
                      {premiumRooms.slice(0, 3).map((room, idx) => (
                        <div key={idx} className="truncate">• {room}</div>
                      ))}
                      {premiumRooms.length > 3 && (
                        <div className="text-xs">+{premiumRooms.length - 3} more</div>
                      )}
                    </div>
                  )}
                  {onClearPremiumAccess && (
                    <button
                      onClick={onClearPremiumAccess}
                      className="mt-2 text-xs text-destructive hover:opacity-80"
                    >
                      Clear All Access
                    </button>
                  )}
                </div>
              </div>
            </li>
          )}

          {headerCta && (
            <li className="hidden lg:block">
              <Button
                href={headerCta.href}
                variant="primary"
                size="sm"
                className="shadow-sm"
              >
                {headerCta.label}
              </Button>
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
                  name={user?.name ?? undefined}
                  role={role ?? undefined}
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
                <Button
                  href="/login"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Sign in
                </Button>
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
