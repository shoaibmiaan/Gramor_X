// File: components/navigation/MobileNav.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

import { Container } from '@/components/design-system/Container';
import { NavLink } from '@/components/design-system/NavLink';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { StreakChip } from '@/components/user/StreakChip';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import { navigationSchema } from '@/config/navigation';
import { filterNavItems, filterNavSections } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Icon } from '@/components/design-system/Icon';
import type { ModuleLink } from './constants';
import { MODULE_LINKS } from './constants';

const toneClassMap: Record<NonNullable<ModuleLink['tone']>, string> = {
  blue: 'bg-muted dark:bg-muted-dark text-primary dark:text-primary-dark ring-1 ring-border dark:ring-border-dark group-hover:bg-primary dark:group-hover:bg-primary-dark group-hover:text-primary-foreground dark:group-hover:text-primary-foreground-dark',
  purple:
    'bg-muted dark:bg-muted-dark text-primary dark:text-primary-dark ring-1 ring-border dark:ring-border-dark group-hover:bg-primary dark:group-hover:bg-primary-dark group-hover:text-primary-foreground dark:group-hover:text-primary-foreground-dark',
  orange:
    'bg-muted dark:bg-muted-dark text-accent-warm dark:text-accent-warm-dark ring-1 ring-border dark:ring-border-dark group-hover:bg-accent-warm dark:group-hover:bg-accent-warm-dark group-hover:text-accent-warm-foreground dark:group-hover:text-accent-warm-foreground-dark',
  green:
    'bg-muted dark:bg-muted-dark text-success dark:text-success-dark ring-1 ring-border dark:ring-border-dark group-hover:bg-success dark:group-hover:bg-success-dark group-hover:text-success-foreground dark:group-hover:text-success-foreground-dark',
};

const getToneClass = (tone?: ModuleLink['tone']) =>
  tone
    ? toneClassMap[tone]
    : 'bg-muted dark:bg-muted-dark text-primary dark:text-primary-dark ring-1 ring-border dark:ring-border-dark group-hover:bg-primary dark:group-hover:bg-primary-dark group-hover:text-primary-foreground dark:group-hover:text-primary-foreground-dark';

interface UserInfo {
  id: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

type MobileNavProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> & {
  user: UserInfo | null;
  role: string | null;
  ready: boolean;
  streak?: number | null;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  mobileModulesOpen: boolean;
  setMobileModulesOpen: (open: boolean) => void;
  signOut: () => Promise<void> | void;
  showAdmin?: boolean;
  hasPremiumAccess?: boolean;
  premiumRooms?: string[];
  onClearPremiumAccess?: () => void;
  subscriptionTier: SubscriptionTier;
};

export function MobileNav({
  user,
  role,
  ready,
  streak = null,
  mobileOpen,
  setMobileOpen,
  mobileModulesOpen,
  setMobileModulesOpen,
  signOut,
  showAdmin = true,
  hasPremiumAccess = false,
  premiumRooms = [],
  onClearPremiumAccess,
  subscriptionTier,
  className,
  ...rest
}: MobileNavProps) {
  const pathname = usePathname();
  const [mobileAiToolsOpen, setMobileAiToolsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('');

  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const isTeacher = role === 'teacher';

  const closeMenu = React.useCallback(() => {
    setMobileOpen(false);
    setMobileModulesOpen(false);
    setMobileAiToolsOpen(false);
    setActiveSection('');
  }, [setMobileOpen, setMobileModulesOpen]);

  const navigationCtx = useMemo(
    () => ({ isAuthenticated: Boolean(user?.id), tier: subscriptionTier }),
    [user?.id, subscriptionTier]
  );

  const mainNavItems = useMemo(() => {
    if (isTeacher) return [];
    return filterNavItems(navigationSchema.header.main, navigationCtx);
  }, [navigationCtx, isTeacher]);

  const practiceNavItem = useMemo(
    () => mainNavItems.find((item) => item.id === 'practice'),
    [mainNavItems]
  );

  const mainNavWithoutPractice = useMemo(
    () => mainNavItems.filter((item) => item.id !== 'practice'),
    [mainNavItems]
  );

  const aiToolItems = useMemo(() => {
    if (isTeacher) return [];
    return filterNavItems(navigationSchema.header.aiTools, navigationCtx);
  }, [navigationCtx, isTeacher]);

  const profileMenu = useMemo(() => {
    if (isTeacher) {
      return [{ id: 'account', label: 'Profile', href: '/account' }];
    }
    return filterNavItems(navigationSchema.header.profile, navigationCtx);
  }, [isTeacher, navigationCtx]);

  const sidebarSections = useMemo(
    () => filterNavSections(navigationSchema.sidebar, navigationCtx),
    [navigationCtx]
  );

  const headerCtaConfig = navigationSchema.header.cta ?? {};
  const headerCta = user?.id ? headerCtaConfig.authed : headerCtaConfig.guest;
  const headerOptional = navigationSchema.header.optional ?? {};

  useEffect(() => {
    if (!mobileOpen) {
      setMobileModulesOpen(false);
      setMobileAiToolsOpen(false);
      setActiveSection('');
    }
  }, [mobileOpen, setMobileAiToolsOpen, setMobileModulesOpen]);

  // Auto-close on route change
  useEffect(() => {
    if (mobileOpen) closeMenu();
  }, [pathname, closeMenu]); // eslint-disable-line react-hooks/exhaustive-deps

  // Body scroll lock while open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchQuery('');
    closeMenu();
  };

  const handleClearPremium = () => {
    onClearPremiumAccess?.();
    closeMenu();
  };

  const toggleSection = (section: string) => {
    const next = activeSection === section ? '' : section;
    setActiveSection(next);

    if (section === 'practice') {
      setMobileModulesOpen(next === 'practice');
    }
    if (section === 'aiTools') {
      setMobileAiToolsOpen(next === 'aiTools');
    }
  };

  const overlay = mobileOpen ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-background/80 dark:bg-background-dark/80 backdrop-blur-sm"
      onClick={closeMenu}
      aria-hidden="true"
    />
  ) : null;

  const panel = mobileOpen ? (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-card dark:bg-card-dark shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
      {...rest}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border dark:border-border-dark p-4">
          <motion.button
            onClick={closeMenu}
            whileTap={{ scale: 0.95 }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted dark:hover:bg-muted-dark transition-colors"
            aria-label="Close menu"
          >
            <Icon name="X" size={20} />
          </motion.button>
          {typeof streak === 'number' && streak > 0 && (
            <StreakChip value={streak} href="/profile/streak" className="shrink-0" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile navigation">
          {/* Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <Icon
                name="Search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground-dark"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border dark:border-border-dark bg-surface-muted dark:bg-surface-muted-dark px-10 py-3 text-sm placeholder:text-muted-foreground dark:placeholder:text-muted-foreground-dark focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark"
              />
            </div>
          </form>

          {/* Main Nav */}
          <ul className="space-y-1 mb-6">
            {mainNavWithoutPractice.map((item) => (
              <li key={item.id}>
                <NavLink
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted dark:hover:bg-muted-dark transition-colors"
                  onClick={closeMenu}
                >
                  <Icon name={item.icon ?? 'Circle'} size={18} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}

            {/* Practice Section */}
            {practiceNavItem && (
              <li>
                <button
                  onClick={() => toggleSection('practice')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 hover:bg-muted dark:hover:bg-muted-dark transition-colors ${
                    mobileModulesOpen ? 'bg-primary/10 dark:bg-primary-dark/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="Layers" size={18} />
                    <span className="font-medium">{practiceNavItem.label}</span>
                  </div>
                  <Icon
                    name={mobileModulesOpen ? 'ChevronUp' : 'ChevronDown'}
                    size={18}
                    className="opacity-70"
                  />
                </button>
                <AnimatePresence>
                  {mobileModulesOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-2 space-y-1 overflow-hidden"
                    >
                      {MODULE_LINKS.map(({ label: moduleLabel, desc, Icon: ModuleIcon, tone }) => (
                        <li key={moduleLabel}>
                          <Link
                            href={`/practice/${moduleLabel.toLowerCase()}`}
                            onClick={closeMenu}
                            className="group flex items-start gap-3 rounded-lg p-3 text-sm transition"
                          >
                            <span
                              className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ring-2 transition ${getToneClass(
                                tone
                              )}`}
                            >
                              {ModuleIcon ? <ModuleIcon className="h-4 w-4" /> : null}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block font-medium">{moduleLabel}</span>
                              {desc && (
                                <span className="text-xs text-muted-foreground dark:text-muted-foreground-dark">
                                  {desc}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            )}

            {/* AI Tools Section */}
            {aiToolItems.length > 0 && (
              <li>
                <button
                  onClick={() => toggleSection('aiTools')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 hover:bg-muted dark:hover:bg-muted-dark transition-colors ${
                    mobileAiToolsOpen ? 'bg-primary/10 dark:bg-primary-dark/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="Sparkles" size={18} />
                    <span className="font-medium">AI Tools</span>
                  </div>
                  <Icon
                    name={mobileAiToolsOpen ? 'ChevronUp' : 'ChevronDown'}
                    size={18}
                    className="opacity-70"
                  />
                </button>
                <AnimatePresence>
                  {mobileAiToolsOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-2 space-y-1 overflow-hidden"
                    >
                      {aiToolItems.map((item) => (
                        <li key={item.id}>
                          <NavLink
                            href={item.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted dark:hover:bg-muted-dark transition-colors text-sm"
                            onClick={closeMenu}
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" size="sm" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            )}

            {/* Partners & Admin */}
            {canSeePartners && (
              <li>
                <NavLink
                  href="/partners"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted dark:hover:bg-muted-dark transition-colors"
                  onClick={closeMenu}
                >
                  <Icon name="Handshake" size={18} />
                  <span className="font-medium">Partners</span>
                </NavLink>
              </li>
            )}
            {canSeeAdmin && (
              <li>
                <NavLink
                  href="/admin/partners"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted dark:hover:bg-muted-dark transition-colors"
                  onClick={closeMenu}
                >
                  <Icon name="Settings" size={18} />
                  <span className="font-medium">Admin</span>
                </NavLink>
              </li>
            )}
          </ul>

          {/* Sidebar Sections */}
          <div className="mt-8 space-y-6">
            {sidebarSections.map((section) => (
              <div key={section.id}>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark px-1">
                  {section.icon && <Icon name={section.icon} className="h-3.5 w-3.5" />}
                  <span>{section.label}</span>
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <NavLink
                        href={item.href}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted dark:hover:bg-muted-dark transition-colors text-sm"
                        onClick={closeMenu}
                      >
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Account Section */}
          {profileMenu.length > 0 && user?.id && (
            <div className="mt-8 pt-6 border-t border-border dark:border-border-dark">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground-dark px-1">
                <Icon name="User" className="h-3.5 w-3.5" />
                <span>Account</span>
              </div>
              <ul className="space-y-1">
                {profileMenu.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted dark:hover:bg-muted-dark transition-colors text-sm"
                      onClick={closeMenu}
                    >
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      closeMenu();
                      void signOut?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive dark:text-destructive-dark hover:bg-destructive/10 dark:hover:bg-destructive-dark/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border dark:focus-visible:ring-border-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon name="LogOut" size={16} />
                    <span>Sign out</span>
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* Auth Section */}
          {!user?.id && ready && (
            <div className="mt-8 space-y-3">
              <Button
                asChild
                fullWidth
                variant="primary"
                className="rounded-xl font-semibold py-3.5"
              >
                <Link href="/login" onClick={closeMenu}>
                  Sign in
                </Link>
              </Button>
              <Button
                asChild
                fullWidth
                variant="outline"
                className="rounded-xl font-semibold py-3.5"
              >
                <Link href="/signup" onClick={closeMenu}>
                  Create account
                </Link>
              </Button>
            </div>
          )}

          {!ready && (
            <div className="mt-6 space-y-2">
              <div className="h-12 w-full animate-pulse rounded-xl bg-muted dark:bg-muted-dark" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-muted dark:bg-muted-dark" />
            </div>
          )}

          {/* Premium summary (optional bottom section) */}
          {hasPremiumAccess && premiumRooms.length > 0 && (
            <div className="mt-8 pt-4 border-t border-border dark:border-border-dark">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground-dark">
                <span>Premium access</span>
                <button
                  type="button"
                  onClick={handleClearPremium}
                  className="text-[11px] font-medium text-destructive dark:text-destructive-dark hover:underline"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-20 overflow-y-auto text-xs text-muted-foreground dark:text-muted-foreground-dark space-y-1">
                {premiumRooms.slice(0, 4).map((room, idx) => (
                  <div key={idx} className="truncate">
                    • {room}
                  </div>
                ))}
                {premiumRooms.length > 4 && (
                  <div>+{premiumRooms.length - 4} more</div>
                )}
              </div>
            </div>
          )}
        </nav>
      </div>
    </motion.div>
  ) : null;

  return (
    <>
      <div className={className} {...rest}>
        <div className="flex items-center gap-2 md:hidden">
          {headerOptional.notifications && <NotificationBell />}
          {headerOptional.themeToggle && <IconOnlyThemeToggle />}
          <motion.button
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
            whileTap={{ scale: 0.95 }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted dark:hover:bg-muted-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border dark:focus-visible:ring-border-dark focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {mobileOpen ? <Icon name="X" size={20} /> : <Icon name="Menu" size={20} />}
          </motion.button>
        </div>
      </div>

      {typeof document !== 'undefined'
        ? createPortal(
            <>
              {overlay}
              {panel}
            </>,
            document.body
          )
        : null}
    </>
  );
}

MobileNav.displayName = 'MobileNav';
export default MobileNav;
