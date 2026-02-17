// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Poppins, Roboto_Slab } from 'next/font/google';

import '@/styles/tokens.css';
import '@/styles/semantic.css';
import '@/styles/globals.css';
import '@/styles/themes/index.css';

import 'aos/dist/aos.css';
import { AnimationProvider } from '@/components/providers/AnimationProvider';

import { ToastProvider } from '@/components/design-system/Toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { supabaseBrowser as supabaseClientSource } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import { LocaleProvider, useLocale } from '@/lib/locale';
import { initIdleTimeout } from '@/utils/idleTimeout';
import useRouteGuard from '@/hooks/useRouteGuard';
import { destinationByRole } from '@/lib/routeAccess';
import { refreshClientFlags, flagsHydratedRef } from '@/lib/flags/refresh';
import { InstalledAppProvider } from '@/hooks/useInstalledApp';

import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import AppLayoutManager from '@/components/layouts/AppLayoutManager';

import { UserProvider, useUserContext } from '@/context/UserContext';
import { OrgProvider } from '@/lib/orgs/context';
import { HighContrastProvider } from '@/context/HighContrastContext';

import { loadTranslations } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n/config';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { getRouteConfig, isAttemptPath } from '@/lib/routes/routeLayoutMap';

// ⭐ NEW BreadcrumbBar V2
import { BreadcrumbBar } from '@/components/navigation/BreadcrumbBar';

const PricingReasonBanner = dynamic(
  () => import('@/components/paywall/PricingReasonBanner'),
  { ssr: false }
);

// ---- Safe Supabase getter (works for both factory or instance exports)
function getSupa() {
  const v: any = supabaseClientSource as any;
  return typeof v === 'function' ? v() : v;
}

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});
const slab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

const IS_CI = process.env.NEXT_PUBLIC_CI === 'true';

// ---------- Skeleton loader ----------
function GuardSkeleton() {
  return (
    <div className="grid min-h-[100dvh] place-items-center">
      <div className="h-6 w-40 animate-pulse rounded bg-border" />
    </div>
  );
}

// ---------- Route type helpers ----------
const isAuthPage = (pathname: string) =>
  /^\/(login|signup|register)(\/|$)/.test(pathname) ||
  /^\/auth\/(login|signup|register|mfa|verify)(\/|$)/.test(pathname) ||
  pathname === '/forgot-password';

const isPremiumRoomRoute = (pathname: string) =>
  pathname.startsWith('/premium/') && !pathname.startsWith('/premium-pin');

// Strict mock/exam attempt runner
const isMockTestsFlowRoute = (pathname: string) => {
  const isMockAttempt = /^\/mock\/[^/]+\/(run|review)(\/|$)/.test(pathname);
  const isWritingAttempt = /^\/writing\/mock\/[^/]+\/(run|review)(\/|$)/.test(pathname);
  return isMockAttempt || isWritingAttempt;
};

// ---------- Auth bridge ----------
function useAuthBridge() {
  const router = useRouter();

  const bridgeSession = useCallback(
    async (event: AuthChangeEvent, sessionNow: Session | null) => {
      const shouldPost =
        event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED';
      if (!shouldPost) return;

      if (event !== 'SIGNED_OUT' && !sessionNow?.access_token) return;

      try {
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ event, session: sessionNow }),
        });
      } catch (err) {
        console.error('Failed to bridge auth session:', err);
      }
    },
    []
  );

  useEffect(() => {
    if (IS_CI) return;

    if (typeof window !== 'undefined') {
      if ((window as any).__GX_AUTH_BRIDGE_ACTIVE) return;
      (window as any).__GX_AUTH_BRIDGE_ACTIVE = true;
    }

    let cancelled = false;
    const supa = getSupa();

    // Initial sync
    (async () => {
      const {
        data: { session },
      } = await supa.auth.getSession();
      if (cancelled) return;

      if (session) {
        await bridgeSession('SIGNED_IN', session);
      } else {
        await bridgeSession('SIGNED_OUT', null);
      }

      if (!flagsHydratedRef.current) {
        void refreshClientFlags();
      }

      // Prevent logged-in user from seeing dashboard login/signup
      if (session?.user && isAuthPage(router.pathname)) {
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next');
        const target =
          next && next.startsWith('/')
            ? next
            : destinationByRole(session.user) ?? '/';
        router.replace(target);
      }
    })();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supa.auth.onAuthStateChange((event, sessionNow) => {
      (async () => {
        if (cancelled) return;
        await bridgeSession(event, sessionNow);

        if (event === 'SIGNED_IN' && sessionNow?.user) {
          const url = new URL(window.location.href);
          const next = url.searchParams.get('next');
          if (next && next.startsWith('/')) {
            router.replace(next);
          } else if (isAuthPage(router.pathname)) {
            router.replace(destinationByRole(sessionNow.user));
          }
        }

        if (event === 'SIGNED_OUT') {
          if (!['/login', '/signup', '/forgot-password'].includes(router.pathname)) {
            router.replace('/login');
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe?.();
      if (typeof window !== 'undefined') {
        (window as any).__GX_AUTH_BRIDGE_ACTIVE = false;
      }
    };
  }, [router, bridgeSession]);
}

// ---------- Route config ----------
function useRouteConfiguration(pathname: string) {
  const { user } = useUserContext();

  return useMemo(() => {
    const routeConfig = getRouteConfig(pathname);

    const derivedIsAuth = routeConfig.layout === 'auth' || isAuthPage(pathname);
    const isAttempt = isAttemptPath(pathname);

    const isNoChromeRoute =
      derivedIsAuth ||
      routeConfig.layout === 'proctoring' ||
      pathname.startsWith('/premium') ||
      /\/focus-mode(\/|$)/.test(pathname) ||
      routeConfig.showChrome === false ||
      isAttempt ||
      isMockTestsFlowRoute(pathname);

    const showLayout = !pathname.startsWith('/premium') && !isNoChromeRoute;

    return {
      isAuthPage: derivedIsAuth,
      isProctoringRoute: routeConfig.layout === 'proctoring',
      showLayout,
      forceLayoutOnAuthPage: derivedIsAuth && !!user,
      isAdminRoute: routeConfig.layout === 'admin',
      isInstitutionsRoute: routeConfig.layout === 'institutions',
      isDashboardRoute:
        routeConfig.layout === 'dashboard' ||
        routeConfig.layout === 'profile' ||
        routeConfig.layout === 'billing' ||
        routeConfig.layout === 'analytics',
      isMarketplaceRoute: routeConfig.layout === 'marketplace',
      isLearningRoute:
        routeConfig.layout === 'learning' || routeConfig.layout === 'resources',
      isCommunityRoute:
        routeConfig.layout === 'community' || routeConfig.layout === 'communication',
      isReportsRoute: routeConfig.layout === 'reports',
      isMarketingRoute:
        routeConfig.layout === 'marketing' || routeConfig.layout === 'support',
      needPremium: pathname.startsWith('/premium'),
      isPremiumRoute: isPremiumRoomRoute(pathname),
      routeConfig,
      isNoChromeRoute,
    };
  }, [pathname, user]);
}

// ---------- Access checks ----------
function useRouteAccessCheck(pathname: string, role?: string | null) {
  const router = useRouter();

  useEffect(() => {
    const config = getRouteConfig(pathname);
    if (!config.requiresAuth) return;
    if (!role) {
      router.replace('/login');
      return;
    }
    if (config.allowedRoles && !config.allowedRoles.includes(role)) {
      router.replace('/restricted');
    }
  }, [pathname, role, router]);
}

// ---------- Inner app ----------
function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const { locale: activeLocale } = useLocale();

  useAuthBridge();

  // i18n
  useEffect(() => {
    void loadTranslations(activeLocale as SupportedLocale);
  }, [activeLocale]);

  // route analytics (stub)
  useEffect(() => {
    const log = (url: string) => {};
    log(router.asPath);
    router.events.on('routeChangeComplete', log);
    return () => router.events.off('routeChangeComplete', log);
  }, [router]);

  const { user, role, isTeacherApproved } = useUserContext() as {
    user: SupabaseUser | null;
    role?: string | null;
    isTeacherApproved?: boolean | null;
  };

  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

  // tier detect
  useEffect(() => {
    const metadata = (user?.user_metadata ?? {}) as { tier?: SubscriptionTier | null };
    const appMeta = (user?.app_metadata ?? {}) as { tier?: SubscriptionTier | null };
    setSubscriptionTier(metadata.tier ?? appMeta.tier ?? 'free');
  }, [user]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ tier?: SubscriptionTier }>).detail;
      if (detail?.tier) setSubscriptionTier(detail.tier);
    };
    window.addEventListener('subscription:tier-updated', handler);
    return () => window.removeEventListener('subscription:tier-updated', handler);
  }, []);

  // route config
  const routeConfiguration = useRouteConfiguration(pathname);
  const forceLayoutOnAuthPage = routeConfiguration.isAuthPage && !!user;

  // access guard
  useRouteAccessCheck(pathname, role);

  // teacher redirect
  useEffect(() => {
    if (!role) return;
    if (role === 'teacher') {
      const onTeacherArea =
        pathname.startsWith('/teacher') || routeConfiguration.isAuthPage;
      if (!onTeacherArea) router.replace('/teacher');
    }
  }, [role, pathname, routeConfiguration.isAuthPage, router]);

  // idle timeout
  const idleMinutes = useMemo(() => {
    try {
      const val =
        env?.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ??
        process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ??
        '30';
      return Number(val) || 30;
    } catch {
      return 30;
    }
  }, []);

  useEffect(() => {
    if (IS_CI) return;
    const cleanup = initIdleTimeout(idleMinutes);
    return cleanup;
  }, [idleMinutes]);

  const { isChecking } = useRouteGuard();
  if (isChecking) return <GuardSkeleton />;

  // base page
  const basePage =
    routeConfiguration.needPremium || routeConfiguration.isPremiumRoute ? (
      <PremiumThemeProvider>
        <Component {...pageProps} key={router.asPath} />
      </PremiumThemeProvider>
    ) : (
      <Component {...pageProps} key={router.asPath} />
    );

  // ⭐ Decide when to show breadcrumb bar
  const showBreadcrumbs =
    !routeConfiguration.isAuthPage &&
    !routeConfiguration.isProctoringRoute &&
    !routeConfiguration.isPremiumRoute &&
    !isMockTestsFlowRoute(pathname) &&
    !pathname.includes('/run') &&
    !pathname.includes('/review') &&
    !routeConfiguration.isNoChromeRoute;

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HighContrastProvider>
        <div
          className={`${poppins.className} ${slab.className}
          min-h-screen min-h-[100dvh] bg-background text-foreground antialiased`}
        >
          <AnimationProvider>
            <AppLayoutManager
              isAuthPage={routeConfiguration.isAuthPage}
              isProctoringRoute={routeConfiguration.isProctoringRoute}
              showLayout={routeConfiguration.showLayout}
              forceLayoutOnAuthPage={forceLayoutOnAuthPage}
              isAdminRoute={routeConfiguration.isAdminRoute}
              isInstitutionsRoute={routeConfiguration.isInstitutionsRoute}
              isDashboardRoute={routeConfiguration.isDashboardRoute}
              isMarketplaceRoute={routeConfiguration.isMarketplaceRoute}
              isLearningRoute={routeConfiguration.isLearningRoute}
              isCommunityRoute={routeConfiguration.isCommunityRoute}
              isReportsRoute={routeConfiguration.isReportsRoute}
              isMarketingRoute={routeConfiguration.isMarketingRoute}
              subscriptionTier={subscriptionTier}
              role={role}
              isTeacherApproved={isTeacherApproved}
              guardFallback={() => <GuardSkeleton />}

              // ⭐ SEND TO LAYOUT MANAGER
              showBreadcrumbs={showBreadcrumbs}
            >
              {(router.pathname === '/pricing' ||
                router.pathname === '/pricing/overview') && (
                <PricingReasonBanner />
              )}

              {basePage}
            </AppLayoutManager>
          </AnimationProvider>
        </div>
      </HighContrastProvider>
    </ThemeProvider>
  );
}

// ---------- outer wrapper ----------
export default function App(props: AppProps) {
  return (
    <LocaleProvider initialLocale="en">
      <ToastProvider>
        <NotificationProvider>
          <UserProvider>
            <OrgProvider>
              <InstalledAppProvider>
                <InnerApp {...props} />
              </InstalledAppProvider>
            </OrgProvider>
          </UserProvider>
        </NotificationProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
