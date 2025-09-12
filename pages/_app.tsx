import type { AppProps } from 'next/app';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';

import '@/styles/tokens.css';         // Day-5 tokens (must be first so vars exist)
import '@/styles/premium.css';        // Premium theme variables/utilities
import '@/styles/semantic.css';
import '@/styles/globals.css';
import '@/styles/themes/index.css';

import Layout from '@/components/Layout';
import { ToastProvider } from '@/components/design-system/Toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import { LanguageProvider } from '@/lib/locale';
import { initIdleTimeout } from '@/utils/idleTimeout';
import { isGuestOnlyRoute, isPublicRoute } from '@/lib/routeAccess';
import useRouteGuard from '@/hooks/useRouteGuard';

import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import SidebarAI from '@/components/ai/SidebarAI';
import AuthAssistant from '@/components/auth/AuthAssistant';

// Existing layouts
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PublicMarketingLayout from '@/components/layouts/PublicMarketingLayout';
import AdminLayout from '@/components/layouts/AdminLayout';
import LearningLayout from '@/components/layouts/LearningLayout';
import CommunityLayout from '@/components/layouts/CommunityLayout';
import MarketplaceLayout from '@/components/layouts/MarketplaceLayout';
import InstitutionsLayout from '@/components/layouts/InstitutionsLayout';

// NEW layouts
import AuthLayout from '@/components/layouts/AuthLayout';
import ReportsLayout from '@/components/layouts/ReportsLayout';
import ProctoringLayout from '@/components/layouts/ProctoringLayout';
import ExamLayout from '@/components/layouts/ExamLayout';

import { Poppins, Roboto_Slab } from 'next/font/google';
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

// ✅ CI/dev quiet flag (prevents auth noise when no session)
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

  const needPremium = useMemo(
    () => pathname.startsWith('/premium') || pathname.startsWith('/pricing'),
    [pathname]
  );

  const isAuthPage = useMemo(
    () =>
      /^\/(login|signup|register)(\/|$)/.test(pathname) ||
      /^\/auth\/(login|signup|register|mfa|verify)(\/|$)/.test(pathname) ||
      pathname === '/forgot-password',
    [pathname]
  );

  const isNoChromeRoute = useMemo(
    () => /\/exam(\/|$)|\/exam-room(\/|$)|\/focus-mode(\/|$)/.test(pathname) || isAuthPage,
    [pathname, isAuthPage]
  );

  const showLayout = !needPremium && !isNoChromeRoute;

  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/study-plan') ||
    pathname.startsWith('/progress') ||
    pathname.startsWith('/leaderboard') ||
    pathname.startsWith('/mistakes') ||
    pathname.startsWith('/pwa');

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/teacher');

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
    pathname.startsWith('/bookings') ||
    pathname === '/partners';

  const isInstitutionsRoute = pathname.startsWith('/institutions');

  const isReportsRoute = pathname.startsWith('/reports') || pathname.startsWith('/placement');

  const isProctoringRoute =
    pathname.startsWith('/proctoring/check') || pathname.startsWith('/proctoring/exam');

  const isExamRoute =
    pathname.startsWith('/mock') ||
    pathname.startsWith('/listening') ||
    pathname.startsWith('/reading') ||
    pathname.startsWith('/writing') ||
    pathname.startsWith('/speaking') ||
    pathname.startsWith('/exam/rehearsal') ||
    pathname.startsWith('/premium/listening') ||
    pathname.startsWith('/premium/reading') ||
    pathname.startsWith('/proctoring/exam');

  useEffect(() => {
    if (IS_CI) return;
    const cleanup = initIdleTimeout(env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES);
    return cleanup;
  }, []);

  useEffect(() => {
    if (IS_CI) return;
    let unsub: (() => void) | undefined;
    (async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!session) return;
      const { data: sub } = supabaseBrowser.auth.onAuthStateChange(async (event, sessionNow) => {
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ event, session: sessionNow }),
          });
        } catch { /* silent */ }
      });
      unsub = () => sub?.subscription?.unsubscribe();
    })();
    return () => unsub?.();
  }, []);

  const { isChecking } = useRouteGuard();

  useEffect(() => {
    if (IS_CI) return;
    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      const exp = session?.expires_at;
      if (session && exp && exp <= Date.now() / 1000) {
        await supabaseBrowser.auth.signOut();
        if (
          !isGuestOnlyRoute(router.pathname) &&
          !isPublicRoute(router.pathname) &&
          !/^\/pricing(\/|$)/.test(router.pathname)
        ) {
          router.replace('/login');
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [router]);

  if (isChecking) return <GuardSkeleton />;

  // Base page (no extra font wrappers here; fonts applied once at the top-level div)
  const basePage = needPremium ? (
    <PremiumThemeProvider>
      <Component {...pageProps} />
    </PremiumThemeProvider>
  ) : (
    <Component {...pageProps} />
  );

  let content = basePage;
  if (showLayout) {
    if (isAdminRoute) content = <AdminLayout>{basePage}</AdminLayout>;
    else if (isInstitutionsRoute) content = <InstitutionsLayout>{basePage}</InstitutionsLayout>;
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
      {/* Fonts applied once here */}
      <div className={`${poppins.variable} ${slab.variable} ${poppins.className} min-h-[100dvh] bg-background text-foreground`}>
        {showLayout ? (
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
      </div>
    </ThemeProvider>
  );
}

export default function App(props: AppProps) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <NotificationProvider>
          <InnerApp {...props} />
        </NotificationProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
