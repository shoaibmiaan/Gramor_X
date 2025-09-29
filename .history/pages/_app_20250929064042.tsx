// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';

import '@/styles/tokens.css';
import '@/styles/premium.css';
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
import useRouteGuard from '@/hooks/useRouteGuard';

import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import SidebarAI from '@/components/ai/SidebarAI';
import AuthAssistant from '@/components/auth/AuthAssistant';

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
  return (
    <div className="mx-auto max-w-xl rounded-ds-2xl border border-border p-6 card-surface">
      <h1 className="text-xl font-semibold">Complete Teacher Onboarding</h1>
      <p className="mt-2 text-muted-foreground">
        Your account is created but not approved yet. Please complete the onboarding form. After admin approval,
        you&apos;ll get access to teacher tools.
      </p>
      <div className="mt-4 grid gap-3">
        <div className="grid gap-2">
          <label className="text-sm">Full Name</label>
          <input className="input w-full" placeholder="Your name" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Subject / Expertise</label>
          <input className="input w-full" placeholder="e.g., IELTS Writing" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Experience</label>
          <input className="input w-full" placeholder="Years / brief profile" />
        </div>
        <button className="btn mt-2">Submit for Approval</button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Note: This is a placeholder form. Hook it to your real onboarding page or API when ready.
      </p>
    </div>
  );
}

function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;

  // Expecting UserContext to expose approval status; default false if missing
  const { role, isTeacherApproved } = useUserContext() as {
    role?: string | null;
    isTeacherApproved?: boolean | null;
  };

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

  // Idle timeout
  useEffect(() => {
    if (IS_CI) return;
    const cleanup = initIdleTimeout(env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES);
    return cleanup;
  }, []);

  // Keep backend session cookie in sync
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
      <div className={`${poppins.className} ${slab.className} min-h-[100dvh] bg-background text-foreground`}>
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
          <UserProvider>
            <InnerApp {...props} />
          </UserProvider>
        </NotificationProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
