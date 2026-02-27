// components/navigation/DesktopNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';
import { NavLink } from '@/components/design-system/NavLink';
import { UserMenu } from '@/components/design-system/UserMenu';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { StreakChip } from '@/components/user/StreakChip';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import ModuleMenu from './ModuleMenu';

import { navigationSchema } from '@/config/navigation';
import { filterNavItems } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type DesktopNavProps = {
  user: SupabaseUser | null;
  role: string;
  ready: boolean;
  streak?: number | null;
  openModules: boolean;
  setOpenModules: (open: boolean) => void;
  modulesRef: React.RefObject<HTMLLIElement>;
  signOut: () => Promise<void> | void;
  showAdmin?: boolean;
  className?: string;
  hasPremiumAccess: boolean;
  premiumRooms: string[];
  onClearPremiumAccess: () => void;
  subscriptionTier: SubscriptionTier;
};

type NavContext = {
  isAuthenticated: boolean;
  tier: SubscriptionTier;
};

export const DesktopNav: React.FC<DesktopNavProps> = ({
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
  hasPremiumAccess,
  premiumRooms,
  onClearPremiumAccess,
  subscriptionTier,
}) => {
  const uid = user?.id ?? null;
  const isTeacher = role === 'teacher';
  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const isAuthenticated = Boolean(uid);

  const navCtx: NavContext = React.useMemo(
    () => ({ isAuthenticated, tier: subscriptionTier }),
    [isAuthenticated, subscriptionTier]
  );

  const navItemClass =
    'nav-pill text-small font-medium text-foreground/80 dark:text-foreground-dark/80 hover:text-foreground dark:hover:text-foreground-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:focus-visible:ring-focus-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  // Profile menu entries for user dropdown
  const profileMenu = React.useMemo(() => {
    if (isTeacher) {
      return [{ id: 'account', label: 'Profile', href: '/profile/account' }];
    }
    return filterNavItems(navigationSchema.header.profile, navCtx);
  }, [isTeacher, navCtx]);

  // Main header nav items
  const mainNavItems = React.useMemo(() => {
    if (isTeacher) return [];
    const items = filterNavItems(navigationSchema.header.main, navCtx);
    // If authed, hide duplicate "Home"
    return items.filter((item) => !(item.id === 'home' && uid));
  }, [navCtx, isTeacher, uid]);

  const aiToolItems = React.useMemo(() => {
    if (isTeacher) return [];
    return filterNavItems(navigationSchema.header.aiTools, navCtx);
  }, [navCtx, isTeacher]);

  const headerCtaConfig = navigationSchema.header.cta ?? {};
  const headerCta = uid ? headerCtaConfig.authed : headerCtaConfig.guest;
  const headerOptional = navigationSchema.header.optional ?? {};

  // AI tools dropdown state
  const [openAiTools, setOpenAiTools] = React.useState(false);
  const aiMenuRef = React.useRef<HTMLDivElement | null>(null);
  const aiButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const aiToolsRef = React.useRef<HTMLLIElement | null>(null);

  // Focus on first item when AI tools opens
  React.useEffect(() => {
    if (!openAiTools) return;
    const firstLink = aiMenuRef.current?.querySelector<HTMLAnchorElement>('a,button');
    firstLink?.focus();
  }, [openAiTools]);

  // Close AI tools on outside click / Esc
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

  // Only one menu open at a time
  React.useEffect(() => {
    if (openModules) setOpenAiTools(false);
  }, [openModules]);

  const isPremiumTier = subscriptionTier && subscriptionTier !== 'free';

  return (
    <nav
      className={cn(
        'flex items-center justify-between gap-4 text-sm',
        className
      )}
      aria-label="Primary"
    >
      <div className="flex items-center gap-4">
        {/* LEFT: main nav */}
        <ul className="relative flex items-center gap-2">
          {/* Dashboard shortcut for authenticated learners */}
          {uid && !isTeacher && (
            <li>
              <NavLink href="/dashboard" className={navItemClass} label="Dashboard" />
            </li>
          )}

          {/* Teacher entry */}
          {isTeacher && uid && (
            <li>
              <NavLink href="/teacher" className={navItemClass} label="Teacher" />
            </li>
          )}

          {/* Main items; "practice" becomes ModuleMenu */}
          {!isTeacher &&
            mainNavItems.map((item) =>
              item.id === 'practice' ? (
                <ModuleMenu
                  key={item.id}
                  open={openModules}
                  setOpen={setOpenModules}
                  modulesRef={modulesRef}
                />
              ) : (
                <li key={item.id}>
                  <NavLink href={item.href} className={navItemClass} label={item.label} />
                </li>
              )
            )}

          {/* AI Tools dropdown */}
          {!isTeacher && aiToolItems.length > 0 && (
            <li ref={aiToolsRef}>
              <motion.button
                ref={aiButtonRef}
                type="button"
                onClick={() => setOpenAiTools((v) => !v)}
                whileHover={{ scale: 1.02 }}
                className={cn(navItemClass, openAiTools && 'is-active')}
              >
                <Icon name="Sparkles" size={16} className="mr-1" />
                AI Tools
                <svg
                  className="ml-1 h-3.5 w-3.5 opacity-80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d={openAiTools ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                </svg>
              </motion.button>

              <AnimatePresence>
                {openAiTools && (
                  <motion.div
                    id="ai-tools-menu"
                    ref={aiMenuRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-3 w-64 rounded-xl border border-border dark:border-border-dark bg-card dark:bg-card-dark p-3 shadow-lg"
                    role="menu"
                  >
                    <ul className="space-y-1">
                      {aiToolItems.map((item) => (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className="flex items-start gap-2 rounded-lg px-3 py-2 text-left text-small hover:bg-surface-muted dark:hover:bg-surface-muted-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:focus-visible:ring-focus-dark"
                            onClick={() => setOpenAiTools(false)}
                            role="menuitem"
                          >
                            <span className="font-medium">{item.label}</span>
                            {item.badge && (
                              <span className="ml-auto inline-flex items-center rounded-full bg-surface-muted dark:bg-surface-muted-dark px-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted dark:text-foreground-muted-dark">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          )}

          {/* Partners / Admin links */}
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

          {/* Premium badge (hover card / indicator) */}
          {(hasPremiumAccess || isPremiumTier) && (
            <li className="relative group">
              <Badge
                variant="accent"
                size="sm"
                className="cursor-default inline-flex items-center gap-1"
              >
                <Icon name="Rocket" size={14} />
                <span>{subscriptionTier === 'free' ? 'Premium' : subscriptionTier}</span>
              </Badge>

              {hasPremiumAccess && (
                <div className="absolute top-full right-0 z-50 mt-2 hidden w-64 group-hover:block">
                  <div className="rounded-xl border border-border dark:border-border-dark bg-card dark:bg-card-dark p-3 shadow-lg">
                    <div className="mb-1 text-xs font-medium text-success dark:text-success-dark">
                      Premium Access Active
                    </div>
                    <div className="mb-2 text-xs text-foreground-muted dark:text-foreground-muted-dark">
                      Access to {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''}
                    </div>

                    {premiumRooms.length > 0 && (
                      <div className="max-h-24 overflow-y-auto text-xs text-foreground-muted dark:text-foreground-muted-dark">
                        {premiumRooms.slice(0, 3).map((room, idx) => (
                          <div key={idx} className="truncate">
                            • {room}
                          </div>
                        ))}
                        {premiumRooms.length > 3 && (
                          <div className="text-xs">+{premiumRooms.length - 3} more</div>
                        )}
                      </div>
                    )}

                    {onClearPremiumAccess && (
                      <button
                        type="button"
                        onClick={onClearPremiumAccess}
                        className="mt-2 text-xs text-destructive dark:text-destructive-dark hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:focus-visible:ring-focus-dark rounded"
                      >
                        Clear All Access
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          )}

          {/* Header CTA */}
          {headerCta && (
            <li className="hidden lg:block">
              <Button
                href={headerCta.href}
                variant="primary"
                size="sm"
                className="shadow-sm rounded-full"
              >
                {headerCta.label}
              </Button>
            </li>
          )}
        </ul>
      </div>

      {/* RIGHT CLUSTER: streak, notifications, theme, user */}
      <div className="flex items-center gap-3">
        {/* Streak chip: always show when ready + logged in */}
        {ready && uid && (
          <StreakChip
            value={streak ?? 0}
            href="/profile/streak"
            className="shrink-0"
          />
        )}

        {/* Notification bell */}
        {headerOptional.notifications && <NotificationBell />}

        {/* Theme toggle */}
        {headerOptional.themeToggle && <IconOnlyThemeToggle />}

        {/* User menu / Sign-in */}
        <div className="ml-1">
          {ready ? (
            uid ? (
              <UserMenu
                userId={uid}
                email={user?.email ?? undefined}
                name={
                  (user?.user_metadata as any)?.full_name ??
                  (user?.user_metadata as any)?.name ??
                  undefined
                }
                role={role ?? undefined}
                avatarUrl={
                  (user?.user_metadata as any)?.avatar_url ??
                  (user?.user_metadata as any)?.avatar ??
                  undefined
                }
                onSignOut={async () => {
                  await signOut?.();
                }}
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
                className="w-full sm:w-auto rounded-full"
              >
                Sign in
              </Button>
            )
          ) : (
            <div className="h-9 w-24 animate-pulse rounded-full bg-surface-muted dark:bg-surface-muted-dark" />
          )}
        </div>
      </div>
    </nav>
  );
};

export default DesktopNav;
