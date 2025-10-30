// pages/_app.tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

import '@/styles/tokens.css';
// Do NOT import '@/styles/premium.css' directly; it is Tailwind input.
// We load the compiled /public/premium.css via <Head> below.
import '@/styles/semantic.css';
import '@/styles/globals.css';
import '@/styles/themes/index.css';

import { ToastProvider } from '@/components/design-system/Toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import { LocaleProvider, useLocale } from '@/lib/locale';
import { initIdleTimeout } from '@/utils/idleTimeout';
import useRouteGuard from '@/hooks/useRouteGuard';
import { destinationByRole } from '@/lib/routeAccess';
import { refreshClientFlags, flagsHydratedRef } from '@/lib/flags/refresh';
import { InstalledAppProvider } from '@/hooks/useInstalledApp';

import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import AppLayoutManager from '@/components/layouts/AppLayoutManager';

import { Poppins, Roboto_Slab } from 'next/font/google';
import { UserProvider, useUserContext } from '@/context/UserContext';
import { OrgProvider } from '@/lib/orgs/context';
import { HighContrastProvider } from '@/context/HighContrastContext';

import { loadTranslations } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n/config';
import type { SubscriptionTier } from '@/lib/navigation/types';

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

function GuardSkeleton() {
  return (
    <div className="grid min-h-[100dvh] place-items-center">
      <div className="h-6 w-40 animate-pulse rounded bg-border" />
    </div>
  );
}

function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const { locale: activeLocale } = useLocale();

  // -------- Route Loading (stable on auth + shallow/hash) --------
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeLoadingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPathRef = useRef<string | null>(null);

  useEffect(() => {
    const toComparablePath = (value: string) => {
      if (!value) return '/';
      const withoutOrigin = value.replace(/^https?:\/\/[^/]+/, '');
      const withoutHash = withoutOrigin.split('#')[0] ?? '';
      const withoutQuery = withoutHash.split('?')[0] ?? '';
      return (withoutQuery || '/').replace(/\/+$/, '') || '/';
    };

    const hasMeaningfulPathChange = (nextUrl: string) => {
      const nextPath = toComparablePath(nextUrl);
      const currentPath = toComparablePath(router.asPath);
      return nextPath !== currentPath;
    };

    const clearTimers = () => {
      if (routeLoadingTimeoutRef.current) {
        clearTimeout(routeLoadingTimeoutRef.current);
        routeLoadingTimeoutRef.current = null;
      }
      if (routeLoadingFallbackRef.current) {
        clearTimeout(routeLoadingFallbackRef.current);
        routeLoadingFallbackRef.current = null;
      }
    };

    const startLoading = (url: string, options: { shallow?: boolean } = {}) => {
      // Ignore shallow and non-meaningful changes
      if (options.shallow) return;
      if (!hasMeaningfulPathChange(url)) {
        pendingPathRef.current = null;
        clearTimers();
        return;
      }
      pendingPathRef.current = toComparablePath(url);
      clearTimers();
      // Small delay to avoid flicker on fast transitions
      routeLoadingTimeoutRef.current = setTimeout(() => {
        setIsRouteLoading(true);
        // Hard cap to recover in edge cases
        routeLoadingFallbackRef.current = setTimeout(() => {
          pendingPathRef.current = null;
          setIsRouteLoading(false);
        }, 12000);
      }, 160);
    };

    const stopLoading = (url?: string) => {
      if (url && pendingPathRef.current) {
        const completedPath = toComparablePath(url);
        if (completedPath !== pendingPathRef.current) {
          pendingPathRef.current = null;
        }
      } else {
        pendingPathRef.current = null;
      }
      clearTimers();
      setIsRouteLoading(false);
    };

    const handleRouteError = () => stopLoading();

    router.events.on('routeChangeStart', startLoading as any);
    router.events.on('beforeHistoryChange', (url, opts) => {
      // When Next is about to mutate history, ensure our pending path matches
      if (!opts?.shallow && hasMeaningfulPathChange(url as string)) {
        pendingPathRef.current = toComparablePath(url as string);
      } else {
        stopLoading();
      }
    });
    router.events.on('routeChangeComplete', stopLoading as any);
    router.events.on('routeChangeError', handleRouteError);

    // Avoid a stuck overlay on tab switch/pagehide
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stopLoading();
    };
    const handlePageHide = () => stopLoading();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      router.events.off('routeChangeStart', startLoading as any);
      router.events.off('beforeHistoryChange', stopLoading as any);
      router.events.off('routeChangeComplete', stopLoading as any);
      router.events.off('routeChangeError', handleRouteError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      clearTimers();
    };
  }, [router]);

  // Reset any fallback on final path
  useEffect(() => {
    if (routeLoadingFallbackRef.current) {
      clearTimeout(routeLoadingFallbackRef.current);
      routeLoadingFallbackRef.current = null;
    }
    pendingPathRef.current = null;
    setIsRouteLoading(false);
  }, [router.asPath]);

  // ---------- i18n ----------
  useEffect(() => {
    void loadTranslations(activeLocale as SupportedLocale);
  }, [activeLocale]);

  // ---------- Lightweight route analytics hook (safe placeholder) ----------
  useEffect(() => {
    const logRoute = (url: string) => {
      if (!url) return;
      // add selective logs here if needed
    };
    logRoute(router.asPath);
    const handleRouteChange = (url: string) => logRoute(url);
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router]);

  // ---------- User / Tier ----------
  const { user, role, isTeacherApproved } = useUserContext() as {
    user: SupabaseUser | null;
    role?: string | null;
    isTeacherApproved?: boolean | null;
  };
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    const metadata = (user?.user_metadata ?? {}) as { tier?: SubscriptionTier | null };
    const appMeta = (user?.app_metadata ?? {}) as { tier?: SubscriptionTier | null };
    const nextTier = metadata.tier ?? appMeta.tier ?? 'free';
    setSubscriptionTier(nextTier);
  }, [user]);

  useEffect(() => {
    const handleTierUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tier?: SubscriptionTier }>).detail;
      if (detail?.tier) setSubscriptionTier(detail.tier);
    };
    window.addEventListener('subscription:tier-updated', handleTierUpdated as EventListener);
    return () => window.removeEventListener('subscription:tier-updated', handleTierUpdated as EventListener);
  }, []);

  // ---------- Route partitions ----------
  const needPremium = useMemo(() => pathname.startsWith('/premium'), [pathname]);
  const isPremiumRoomRoute = useMemo(
    () => pathname.startsWith('/premium/') && !pathname.startsWith('/premium-pin'),
    [pathname]
  );
  const isAuthPage = useMemo(
    () =>
      /^\/(login|signup|register)(\/|$)/.test(pathname) ||
      /^\/auth\/(login|signup|register|mfa|verify)(\/|$)/.test(pathname) ||
      pathname === '/forgot-password',
    [pathname]
  );

  const isMockTestsRoute = useMemo(() => pathname.startsWith('/mock-tests'), [pathname]);
  const isMockTestsLanding = pathname === '/mock-tests';
  const isMockTestsFlowRoute = isMockTestsRoute && !isMockTestsLanding;

  const isNoChromeRoute = useMemo(
    () =>
      /\/exam(\/|$)|\/exam-room(\/|$)|\/focus-mode(\/|$)/.test(pathname) ||
      isAuthPage ||
      isPremiumRoomRoute ||
      isMockTestsFlowRoute,
    [pathname, isAuthPage, isPremiumRoomRoute, isMockTestsFlowRoute]
  );

  const showLayout = !needPremium && !isNoChromeRoute;
  const forceLayoutOnAuthPage = isAuthPage && !!user;

  const isDashboardRoute =
    (pathname.startsWith('/dashboard') && pathname !== '/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/study-plan') ||
    pathname.startsWith('/progress') ||
    pathname.startsWith('/mistakes') ||
    pathname.startsWith('/pwa');

  const isAdminRoute = pathname.startsWith('/admin');
  const isMarketingRoute =
    pathname === '/' ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/predictor') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/data-deletion');
  const isLearningRoute = pathname.startsWith('/learning') || pathname.startsWith('/content/studio');
  const isCommunityRoute = pathname.startsWith('/community');
  const isMarketplaceRoute =
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/coach') ||
    pathname.startsWith('/classes') ||
    pathname === '/partners';
  const isInstitutionsRoute = pathname.startsWith('/institutions');
  const isReportsRoute = pathname.startsWith('/reports') || pathname.startsWith('/placement');
  const isProctoringRoute = pathname.startsWith('/proctoring/check') || pathname.startsWith('/proctoring/exam');

  // ---------- Idle timeout ----------
  const idleMinutes = useMemo(() => Number(env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? 30), []);
  useEffect(() => {
    if (IS_CI) return;
    const cleanup = initIdleTimeout(idleMinutes);
    return cleanup;
  }, [idleMinutes]);

  // ---------- AUTH BRIDGE ----------
  const syncingRef = useRef(false);
  const lastBridgeKeyRef = useRef<string | null>(null);
  const subscribedRef = useRef(false);

  const bridgeSession = async (event: AuthChangeEvent, sessionNow: Session | null) => {
    const shouldPost = event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED';
    if (!shouldPost) return;

    if (event !== 'SIGNED_OUT' && !sessionNow?.access_token) return;

    const token = sessionNow?.access_token ?? '';
    const dedupeKey = `${event}:${token}`;
    if (event !== 'SIGNED_OUT' && lastBridgeKeyRef.current === dedupeKey) return;

    if (syncingRef.current) return;
    syncingRef.current = true;

    const previousKey = lastBridgeKeyRef.current;
    try {
      await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ event, session: sessionNow }),
      });
      lastBridgeKeyRef.current = dedupeKey;
    } catch {
      lastBridgeKeyRef.current = previousKey;
    } finally {
      syncingRef.current = false;
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
      void refreshClientFlags();
    }
  };

  useEffect(() => {
    if (IS_CI) return;

    // Avoid double-subscribe during fast-refresh in dev
    if (typeof window !== 'undefined') {
      // @ts-expect-error dev guard
      if (window.__GX_AUTH_BRIDGE_ACTIVE) return;
      // @ts-expect-error dev guard
      window.__GX_AUTH_BRIDGE_ACTIVE = true;
    }

    let isMounted = true;

    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!isMounted) return;

      if (session) {
        await bridgeSession('SIGNED_IN', session);
      } else {
        await bridgeSession('SIGNED_OUT', null);
      }

      if (!flagsHydratedRef.current) {
        void refreshClientFlags();
      }

      if (session?.user && isAuthPage) {
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next');
        const target = next && next.startsWith('/') ? next : destinationByRole(session.user) ?? '/';
        router.replace(target);
      }
    })();

    if (!subscribedRef.current) {
      const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event, sessionNow) => {
        (async () => {
          await bridgeSession(event, sessionNow);

          // Route reactions AFTER cookie sync so middleware sees it
          if (event === 'SIGNED_IN' && sessionNow?.user) {
            const url = new URL(window.location.href);
            const next = url.searchParams.get('next');
            if (next && next.startsWith('/')) router.replace(next);
            else if (isAuthPage) router.replace(destinationByRole(sessionNow.user));
          }

          if (event === 'SIGNED_OUT') {
            if (!['/login', '/signup', '/forgot-password'].includes(router.pathname)) {
              router.replace('/login');
            }
          }
        })();
      });

      subscribedRef.current = true;

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
        subscribedRef.current = false;
        if (typeof window !== 'undefined') {
          // @ts-expect-error dev guard
          window.__GX_AUTH_BRIDGE_ACTIVE = false;
        }
      };
    }
  }, [router, isAuthPage]);

  // ---------- Teacher hard-redirect ----------
  useEffect(() => {
    if (!role) return;
    if (role === 'teacher') {
      const onTeacherArea = pathname.startsWith('/teacher') || isAuthPage;
      if (!onTeacherArea) router.replace('/teacher');
    }
  }, [role, pathname, isAuthPage, router]);

  const { isChecking } = useRouteGuard();
  if (isChecking) return <GuardSkeleton />;

  // Premium wrapper only for premium room routes
  const basePage = needPremium || isPremiumRoomRoute ? (
    <PremiumThemeProvider>
      <Component {...pageProps} />
    </PremiumThemeProvider>
  ) : (
    <Component {...pageProps} />
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <HighContrastProvider>
        <Head>
          <link rel="preload" href="/premium.css" as="style" />
          <link rel="stylesheet" href="/premium.css" />
        </Head>

        <div className={`${poppins.className} ${slab.className} min-h-screen min-h-[100dvh] bg-background text-foreground antialiased`}>
          <AppLayoutManager
            isAuthPage={isAuthPage}
            isProctoringRoute={isProctoringRoute}
            showLayout={showLayout}
            forceLayoutOnAuthPage={forceLayoutOnAuthPage}
            isAdminRoute={isAdminRoute}
            isInstitutionsRoute={isInstitutionsRoute}
            isDashboardRoute={isDashboardRoute}
            isMarketplaceRoute={isMarketplaceRoute}
            isLearningRoute={isLearningRoute}
            isCommunityRoute={isCommunityRoute}
            isReportsRoute={isReportsRoute}
            isMarketingRoute={isMarketingRoute}
            subscriptionTier={subscriptionTier}
            isRouteLoading={isRouteLoading}
            role={role}
            isTeacherApproved={isTeacherApproved}
            guardFallback={() => <GuardSkeleton />}
          >
            {basePage}
          </AppLayoutManager>
        </div>
      </HighContrastProvider>
    </ThemeProvider>
  );
}

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
