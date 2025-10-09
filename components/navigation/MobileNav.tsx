'use client';

import React from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Container } from '@/components/design-system/Container';
import { NavLink } from '@/components/design-system/NavLink';
import { NotificationBell } from '@/components/design-system/NotificationBell';
import { Button } from '@/components/design-system/Button';
import { StreakChip } from '@/components/user/StreakChip';
import { IconOnlyThemeToggle } from './IconOnlyThemeToggle';
import { navigationSchema } from '@/config/navigation';
import { filterNavItems, filterNavSections } from '@/lib/navigation/utils';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Icon } from '@/components/design-system/Icon';
import type { ModuleLink } from './constants';
import { MODULE_LINKS } from './constants';

const toneClassMap: Record<NonNullable<ModuleLink['tone']>, string> = {
  blue: 'bg-electricBlue/10 text-electricBlue ring-electricBlue/20 group-hover:bg-electricBlue group-hover:text-white group-hover:ring-electricBlue/40',
  purple: 'bg-purpleVibe/10 text-purpleVibe ring-purpleVibe/20 group-hover:bg-purpleVibe group-hover:text-white group-hover:ring-purpleVibe/40',
  orange: 'bg-orange-500/10 text-orange-500 ring-orange-500/20 group-hover:bg-orange-500 group-hover:text-white group-hover:ring-orange-500/40',
  green: 'bg-neonGreen/15 text-neonGreen ring-neonGreen/25 group-hover:bg-neonGreen group-hover:text-dark group-hover:ring-neonGreen/50',
};

const getToneClass = (tone?: ModuleLink['tone']) =>
  tone
    ? toneClassMap[tone]
    : 'bg-primary/10 text-primary ring-primary/15 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/40';

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
  subscriptionTier: SubscriptionTier;
};

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
  subscriptionTier,
  className,
  ...rest
}: MobileNavProps) {
  const canSeePartners = role === 'partner' || role === 'admin';
  const canSeeAdmin = role === 'admin' && showAdmin;
  const mobileItemClass = 'block rounded-lg px-3 py-3 hover:bg-muted';
  const [mobileAiToolsOpen, setMobileAiToolsOpen] = React.useState(false);

  const closeMenu = React.useCallback(() => setMobileOpen(false), [setMobileOpen]);

  const navigationCtx = React.useMemo(
    () => ({ isAuthenticated: Boolean(user?.id), tier: subscriptionTier }),
    [user?.id, subscriptionTier]
  );

  const mainNavItems = React.useMemo(() => filterNavItems(navigationSchema.header.main, navigationCtx), [navigationCtx]);
  const practiceNavItem = React.useMemo(() => mainNavItems.find((item) => item.id === 'practice'), [mainNavItems]);
  const mainNavWithoutPractice = React.useMemo(
    () => mainNavItems.filter((item) => item.id !== 'practice'),
    [mainNavItems]
  );
  const aiToolItems = React.useMemo(() => filterNavItems(navigationSchema.header.aiTools, navigationCtx), [navigationCtx]);
  const profileMenu = React.useMemo(() => filterNavItems(navigationSchema.header.profile, navigationCtx), [navigationCtx]);
  const sidebarSections = React.useMemo(() => filterNavSections(navigationSchema.sidebar, navigationCtx), [navigationCtx]);
  const headerCtaConfig = navigationSchema.header.cta ?? {};
  const headerCta = user?.id ? headerCtaConfig.authed : headerCtaConfig.guest;
  const headerOptional = navigationSchema.header.optional ?? {};

  React.useEffect(() => {
    if (!mobileOpen) {
      setMobileModulesOpen(false);
      setMobileAiToolsOpen(false);
    }
  }, [mobileOpen, setMobileAiToolsOpen, setMobileModulesOpen]);

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
      <Container className="flex h-[100dvh] flex-col overflow-hidden">
        <div className="flex items-center justify-between py-3">
          <StreakChip value={streak} href="/profile/streak" />
          <div className="flex items-center gap-2">
            {headerOptional.notifications && <NotificationBell />}
            {headerOptional.themeToggle && <IconOnlyThemeToggle />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-10">
          {headerCta && (
            <Button asChild fullWidth size="lg" className="mb-4 font-semibold">
              <Link href={headerCta.href} onClick={closeMenu}>
                {headerCta.label}
              </Link>
            </Button>
          )}

          {/* Premium Access Status */}
          {hasPremiumAccess && (
            <div className="mb-4 rounded-lg border border-yellow-200/20 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                <span>⭐</span>
                <span>Premium Access Active</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {premiumRooms.length} room{premiumRooms.length !== 1 ? 's' : ''} available
              </div>
              {onClearPremiumAccess && (
                <button
                  onClick={() => {
                    onClearPremiumAccess();
                    setMobileOpen(false);
                  }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
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
                  <NavLink href="/dashboard" className={mobileItemClass} onClick={closeMenu}>
                    Dashboard
                  </NavLink>
                </li>
              )}

              {hasPremiumAccess && (
                <li>
                  <NavLink
                    href="/premium-room"
                    className={`${mobileItemClass} border border-yellow-200/20 bg-gradient-to-r from-yellow-400/10 to-orange-500/10`}
                    onClick={closeMenu}
                  >
                    <span className="flex items-center gap-2">
                      <span>⭐</span>
                      <span>Premium Room</span>
                    </span>
                  </NavLink>
                </li>
              )}

              {practiceNavItem && (
                <li key={practiceNavItem.id}>
                  <button
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 hover:bg-muted"
                    onClick={() => {
                      const next = !mobileModulesOpen;
                      setMobileModulesOpen(next);
                      if (next) setMobileAiToolsOpen(false);
                    }}
                    aria-expanded={mobileModulesOpen}
                    aria-controls="mobile-practice"
                  >
                    <span className="font-medium">{practiceNavItem.label}</span>
                    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d={mobileModulesOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                    </svg>
                  </button>

                  {mobileModulesOpen && (
                    <div id="mobile-practice" className="mt-2 space-y-3 rounded-xl border border-border bg-muted/40 p-3">
                      <p className="text-small text-muted-foreground">
                        Pick a room to dive straight into skill-specific drills.
                      </p>
                      <ul className="space-y-2">
                        {MODULE_LINKS.map(({ href, label, desc, Icon: RoomIcon, tone }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => {
                                setMobileModulesOpen(false);
                                closeMenu();
                              }}
                              className="group flex items-start gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 transition hover:-translate-y-0.5 hover:border-transparent hover:bg-primary/10 hover:shadow-glow dark:bg-dark/60 dark:hover:bg-purpleVibe/20"
                            >
                              <span
                                className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-2 transition ${getToneClass(tone)}`}
                                aria-hidden="true"
                              >
                                {RoomIcon ? <RoomIcon className="h-5 w-5" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block font-medium">{label}</span>
                                {desc && <span className="text-small text-muted-foreground">{desc}</span>}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )}

              {mainNavWithoutPractice.map((item) => (
                <li key={item.id}>
                  <NavLink href={item.href} className={mobileItemClass} onClick={closeMenu}>
                    {item.label}
                  </NavLink>
                </li>
              ))}

              {aiToolItems.length > 0 && (
                <li>
                  <button
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 hover:bg-muted"
                    onClick={() => setMobileAiToolsOpen(!mobileAiToolsOpen)}
                    aria-expanded={mobileAiToolsOpen}
                    aria-controls="mobile-ai-tools"
                  >
                    <span className="font-medium">AI &amp; Tools</span>
                    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d={mobileAiToolsOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
                    </svg>
                  </button>

                  {mobileAiToolsOpen && (
                    <ul id="mobile-ai-tools" className="mt-1 ml-2 overflow-hidden rounded-lg border border-border">
                      {aiToolItems.map((item) => (
                        <li key={item.id}>
                          <NavLink
                            href={item.href}
                            className="block px-4 py-3 hover:bg-muted"
                            onClick={() => {
                              setMobileAiToolsOpen(false);
                              closeMenu();
                            }}
                          >
                            {item.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )}

              {canSeePartners && (
                <li>
                  <NavLink href="/partners" className={mobileItemClass} onClick={closeMenu}>
                    Partners
                  </NavLink>
                </li>
              )}
              {canSeeAdmin && (
                <li>
                  <NavLink href="/admin/partners" className={mobileItemClass} onClick={closeMenu}>
                    Admin
                  </NavLink>
                </li>
              )}
            </ul>

            <div className="mt-6 space-y-4">
              {sidebarSections.map((section) => (
                <div key={section.id}>
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.icon && <Icon name={section.icon} className="h-4 w-4" />}
                    <span>{section.label}</span>
                  </div>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <NavLink href={item.href} className={mobileItemClass} onClick={closeMenu}>
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {profileMenu.length > 0 && user?.id && (
              <div className="mt-6">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</div>
                <ul className="space-y-1">
                  {profileMenu.map((item) => (
                    <li key={item.id}>
                      <NavLink href={item.href} className={mobileItemClass} onClick={closeMenu}>
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => {
                        closeMenu();
                        void signOut();
                      }}
                      className="w-full rounded-lg px-3 py-3 text-left font-medium text-danger hover:bg-danger/10"
                    >
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {!user?.id && ready && (
              <div className="mt-6 grid gap-2">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90"
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center rounded-full border border-primary px-5 py-3 font-semibold text-primary hover:bg-primary/10"
                  onClick={closeMenu}
                >
                  Create account
                </Link>
              </div>
            )}

            {!ready && <div className="mt-4 h-10 w-full animate-pulse rounded-full bg-muted" />}
          </nav>
        </div>
      </Container>
    </div>
  ) : null;

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        {headerOptional.notifications && <NotificationBell />}
        {headerOptional.themeToggle && <IconOnlyThemeToggle />}
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
