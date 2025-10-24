// pages/_app.tsx
import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

import '@/styles/tokens.css';
// Do NOT import '@/styles/premium.css' directly; it is Tailwind input.
// We load the compiled /public/premium.css via <Head> below.
import '@/styles/semantic.css';
import '@/styles/globals.css';
import '@/styles/themes/index.css';

import Layout from '@/components/Layout';
import { ToastProvider } from '@/components/design-system/Toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import { LocaleProvider, useLocale } from '@/lib/locale'; // ⬅️ UPDATED
import { initIdleTimeout } from '@/utils/idleTimeout';
import useRouteGuard from '@/hooks/useRouteGuard';
import { destinationByRole } from '@/lib/routeAccess';
import { primeClientSnapshot } from '@/lib/flags';

import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import SidebarAI from '@/components/ai/SidebarAI';
import AuthAssistant from '@/components/auth/AuthAssistant';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import UpgradeModal from '@/components/premium/UpgradeModal';
import { RouteLoadingOverlay } from '@/components/common/RouteLoadingOverlay';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import PublicMarketingLayout from '@/components/layouts/PublicMarketingLayout';
import AdminLayout from '@/components/layouts/AdminLayout';
import LearningLayout from '@/components/layouts/LearningLayout';
import CommunityLayout from '@/components/layouts/CommunityLayout';
import MarketplaceLayout from '@/components/layouts/MarketplaceLayout';
import InstitutionsLayout from '@/components/layouts/InstitutionsLayout';
import AuthLayout from '@/components/layouts/AuthLayout';
import ReportsLayout from '@/components/layouts/ReportsLayout';
import ProctoringLayout from '@/components/layouts/ProctoringLayout';
import ExamLayout from '@/components/layouts/ExamLayout';

import TeacherLayout from '@/components/layouts/TeacherLayout';
import TeacherProfile from '@/components/teacher/TeacherProfile';

import { Poppins, Roboto_Slab } from 'next/font/google';
import { UserProvider, useUserContext } from '@/context/UserContext';
import { OrgProvider } from '@/lib/orgs/context';
import { HighContrastProvider } from '@/context/HighContrastContext';

// ✅ NEW: global plan guard (client-side gating + ribbon)
import GlobalPlanGuard from '@/components/GlobalPlanGuard';
import { loadTranslations } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n/config';
import { logWritingAnalyticsView } from '@/lib/analytics/writing-events';

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

// Minimal inline onboarding gate (no extra imports)
function TeacherOnboardingGate() {
  const router = useRouter();

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void router.push('/teacher/register');
    },
    [router]
  );

  return (
    <Card className="mx-auto max-w-2xl" padding="lg" insetBorder>
      <form
        className="space-y-5"
        onSubmit={handleSubmit}
        aria-describedby="teacher-onboarding-note"
      >
        <div className="space-y-2">
          <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">Teacher onboarding</p>
          <h2 className="text-h3 font-semibold text-foreground">Complete your profile</h2>
          <p className="text-small text-muted-foreground">
            Your account is created but not approved yet. Share a quick profile so our team can unlock the teacher
            workspace for you.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="full-name" label="Full name" placeholder="Your name" autoComplete="name" />
          <Input name="subject" label="Subject / expertise" placeholder="e.g., IELTS Writing" />
        </div>

        <Textarea
          name="experience"
          label="Experience"
          placeholder="Tell us about your IELTS teaching experience"
          hint="This is a placeholder form. Connect it to your API when ready."
          rows={4}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" size="lg">
            Open onboarding form
          </Button>
          <Button asChild variant="link" size="sm">
            <Link href="/teacher/register">Fill it later</Link>
          </Button>
        </div>

        <p id="teacher-onboarding-note" className="text-caption text-muted-foreground">
          Data entered here is not saved yet — you&apos;ll complete the official onboarding on the next screen.
        </p>
      </form>
    </Card>
  );
}

function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const { locale: activeLocale } = useLocale();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flagsHydratedRef = useRef(false);

  const refreshClientFlags = useCallback(async () => {
    try {
      const res = await fetch('/api/debug/feature-flags', { credentials: 'same-origin' });
      if (!res.ok) return;
      const payload = (await res.json()) as { flags?: Record<string, boolean> };
      if (payload?.flags) {
        primeClientSnapshot(payload.flags);
        flagsHydratedRef.current = true;
      }
    } catch {
      // ignore hydration errors — feature checks fall back to defaults
    }
  }, []);

  useEffect(() => {
    const clearRouteLoadingTimeout = () => {
      if (routeLoadingTimeoutRef.current) {
        clearTimeout(routeLoadingTimeoutRef.current);
        routeLoadingTimeoutRef.current = null;
      }
    };

    const startLoading = () => {
      clearRouteLoadingTimeout();
      routeLoadingTimeoutRef.current = setTimeout(() => {
        setIsRouteLoading(true);
      }, 200);
    };

    const stopLoading = () => {
      clearRouteLoadingTimeout();
      setIsRouteLoading(false);
    };

    router.events.on('routeChangeStart', startLoading);
    router.events.on('routeChangeComplete', stopLoading);
    router.events.on('routeChangeError', stopLoading);

    return () => {
      router.events.off('routeChangeStart', startLoading);
      router.events.off('routeChangeComplete', stopLoading);
      router.events.off('routeChangeError', stopLoading);
      clearRouteLoadingTimeout();
    };
  }, [router]);

  useEffect(() => {
    void loadTranslations(activeLocale as SupportedLocale);
  }, [activeLocale]);

  useEffect(() => {
    const logRoute = (url: string) => {
      if (!url) return;
      if (url.startsWith('/analytics/writing')) {
        logWritingAnalyticsView({ source: 'route' });
      }
    };

    logRoute(router.asPath);

    const handleRouteChange = (url: string) => {
      logRoute(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Expecting UserContext to expose approval status; default false if missing
  const { user, role, isTeacherApproved } = useUserContext() as {
    user: SupabaseUser | null;
    role?: string | null;
    isTeacherApproved?: boolean | null;
  };

  const needPremium = useMemo(
    () => pathname.startsWith('/premium'),
    [pathname]
  );

  // Check if it's a premium room route that requires PIN access
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
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/mistakes') ||
    pathname.startsWith('/pwa');

  // IMPORTANT: do NOT include '/teacher' in admin routes
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

  const isProctoringRoute =
    pathname.startsWith('/proctoring/check') || pathname.startsWith('/proctoring/exam');

  const isExamRoute =
    isMockTestsFlowRoute ||
    pathname.startsWith('/mock/') ||
    pathname.startsWith('/listening') ||
    pathname.startsWith('/reading') ||
    pathname.startsWith('/writing') ||
    pathname.startsWith('/speaking') ||
    pathname.startsWith('/exam/rehearsal') ||
    pathname.startsWith('/premium/listening') ||
    pathname.startsWith('/premium/reading') ||
    pathname.startsWith('/proctoring/exam');

  // Idle timeout (coerce to number safely)
  const idleMinutes = useMemo(
    () => Number(env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? 30),
    []
  );
  useEffect(() => {
    if (IS_CI) return;
    const cleanup = initIdleTimeout(idleMinutes);
    return cleanup;
  }, [idleMinutes]);

  // ---------- AUTH BRIDGE: sync server cookies + correct redirects ----------
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
      await refreshClientFlags();
    }
  };

  useEffect(() => {
    if (IS_CI) return;

    // Avoid double-subscribe during fast-refresh in dev
    if (typeof window !== 'undefined') {
      // @ts-expect-error TODO: type global flag
      if (window.__GX_AUTH_BRIDGE_ACTIVE) return;
      // @ts-expect-error TODO: type global flag
      window.__GX_AUTH_BRIDGE_ACTIVE = true;
    }

    let isMounted = true;

    // 1) On mount, sync initial session and leave auth pages if already signed-in
    (async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!isMounted) return;

      if (session) {
        await bridgeSession('SIGNED_IN', session);
      } else {
        await bridgeSession('SIGNED_OUT', null);
      }

      if (!flagsHydratedRef.current) {
        await refreshClientFlags();
      }

      if (session?.user && isAuthPage) {
        const url = new URL(window.location.href);
        const next = url.searchParams.get('next');
        const target =
          next && next.startsWith('/') ? next : destinationByRole(session.user) ?? '/';
        router.replace(target);
      }
    })();

    // 2) Subscribe to auth changes
    if (!subscribedRef.current) {
      const {
        data: { subscription },
      } = supabaseBrowser.auth.onAuthStateChange((event, sessionNow) => {
        (async () => {
          await bridgeSession(event, sessionNow);

          // Route reactions AFTER cookie sync so middleware sees it
          if (event === 'SIGNED_IN' && sessionNow?.user) {
            const url = new URL(window.location.href);
            const next = url.searchParams.get('next');

            if (next && next.startsWith('/')) {
              router.replace(next);
            } else if (isAuthPage) {
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

      subscribedRef.current = true;

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
        subscribedRef.current = false;
        if (typeof window !== 'undefined') {
          // @ts-expect-error TODO: type global flag
          window.__GX_AUTH_BRIDGE_ACTIVE = false;
        }
      };
    }
  }, [router, isAuthPage]);

  // Hard redirect teachers away from non-teacher sections
  useEffect(() => {
    if (!role) return;
    if (role === 'teacher') {
      const onTeacherArea = pathname.startsWith('/teacher') || isAuthPage;
      if (!onTeacherArea) {
        router.replace('/teacher');
      }
    }
  }, [role, pathname, isAuthPage, router]);

  const { isChecking } = useRouteGuard();
  if (isChecking) return <GuardSkeleton />;

  // For premium room routes, wrap with PremiumThemeProvider and don't use regular layout
  const basePage = needPremium || isPremiumRoomRoute ? (
    <PremiumThemeProvider>
      <Component {...pageProps} />
    </PremiumThemeProvider>
  ) : (
    <Component {...pageProps} />
  );

  let content = basePage;

  if (showLayout) {
    if (isAdminRoute) content = <AdminLayout>{basePage}</AdminLayout>;
    else if (pathname.startsWith('/teacher')) {
      // Gate teacher area
      if (role === 'admin') {
        // Admins can view teacher screens for QA
        content = (
          <TeacherLayout userRole={role ?? 'guest'}>
            <TeacherProfile />
          </TeacherLayout>
        );
      } else if (role === 'teacher') {
        const approved = Boolean(isTeacherApproved);
        content = (
          <TeacherLayout userRole={role ?? 'guest'}>
            {approved ? <TeacherProfile /> : <TeacherOnboardingGate />}
          </TeacherLayout>
        );
      } else {
        router.push('/restricted');
        content = <GuardSkeleton />;
      }
    } else if (isInstitutionsRoute) content = <InstitutionsLayout>{basePage}</InstitutionsLayout>;
    else if (isDashboardRoute) content = <DashboardLayout>{basePage}</DashboardLayout>;
    else if (isMarketplaceRoute) content = <MarketplaceLayout>{basePage}</MarketplaceLayout>;
    else if (isLearningRoute) content = <LearningLayout>{basePage}</LearningLayout>;
    else if (isCommunityRoute) content = <CommunityLayout>{basePage}</CommunityLayout>;
    else if (isReportsRoute) content = <ReportsLayout>{basePage}</ReportsLayout>;
    else if (isExamRoute) content = <ExamLayout>{basePage}</ExamLayout>;
    else if (isMarketingRoute) content = <PublicMarketingLayout>{basePage}</PublicMarketingLayout>;
  }

  const nakedContent = isAuthPage ? (
    <AuthLayout>{basePage}</AuthLayout>
  ) : isProctoringRoute ? (
    pathname.startsWith('/proctoring/exam') ? (
      <ProctoringLayout>
        <ExamLayout>{basePage}</ExamLayout>
      </ProctoringLayout>
    ) : (
      <ProctoringLayout>{basePage}</ProctoringLayout>
    )
  ) : isExamRoute ? (
    <ExamLayout>{basePage}</ExamLayout>
  ) : (
    basePage
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <HighContrastProvider>
        {/* Load the compiled premium DS stylesheet globally */}
        <Head>
          <link rel="preload" href="/premium.css" as="style" />
          <link rel="stylesheet" href="/premium.css" />
        </Head>

        <div
          className={`${poppins.className} ${slab.className} min-h-screen min-h-[100dvh] bg-background text-foreground antialiased`}
        >
          {/* ✅ NEW: Client-side plan guard + ribbon + route protection */}
          <GlobalPlanGuard />

          {forceLayoutOnAuthPage ? (
            <Layout>
              <ImpersonationBanner />
              {nakedContent}
            </Layout>
          ) : showLayout ? (
            <Layout>
              <ImpersonationBanner />
              {content}
            </Layout>
          ) : (
            <>
              <ImpersonationBanner />
              {nakedContent}
            </>
          )}
          <AuthAssistant />
          <SidebarAI />
          <UpgradeModal />
          <RouteLoadingOverlay active={isRouteLoading} />
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
              <InnerApp {...props} />
            </OrgProvider>
          </UserProvider>
        </NotificationProvider>
      </ToastProvider>
    </LocaleProvider>
  );
}
