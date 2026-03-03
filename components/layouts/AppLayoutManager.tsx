// components/layouts/AppLayoutManager.tsx
import { useCallback, useEffect, useState, useMemo, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { SubscriptionTier } from '@/lib/navigation/types';

import Layout from '@/components/Layout';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import SidebarAI from '@/components/ai/SidebarAI';
import AuthAssistant from '@/components/auth/AuthAssistant';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import UpgradeModal from '@/components/premium/UpgradeModal';
import { RouteLoadingOverlay } from '@/components/common/RouteLoadingOverlay';
import GlobalPlanGuard from '@/components/GlobalPlanGuard';

import AdminLayout from '@/components/layouts/AdminLayout';
import LearningLayout from '@/components/layouts/LearningLayout';
import CommunityLayout from '@/components/layouts/CommunityLayout';
import MarketplaceLayout from '@/components/layouts/MarketplaceLayout';
import InstitutionsLayout from '@/components/layouts/InstitutionsLayout';
import AuthLayout from '@/components/layouts/AuthLayout';
import ReportsLayout from '@/components/layouts/ReportsLayout';
import ProctoringLayout from '@/components/layouts/ProctoringLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PublicMarketingLayout from '@/components/layouts/PublicMarketingLayout';
import TeacherLayout from '@/components/layouts/TeacherLayout';
import TeacherProfile from '@/components/teacher/TeacherProfile';
import ProfileLayout from '@/components/layouts/ProfileLayout';
import CommunicationLayout from '@/components/layouts/CommunicationLayout';
import BillingLayout from '@/components/layouts/BillingLayout';
import ResourcesLayout from '@/components/layouts/ResourcesLayout';
import AnalyticsLayout from '@/components/layouts/AnalyticsLayout';
import SupportLayout from '@/components/layouts/SupportLayout';

// ⭐ NEW — Breadcrumb Bar V2
import { BreadcrumbBar } from '@/components/navigation/BreadcrumbBar';


// -----------------------
// Error Boundary
// -----------------------
const LayoutErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <Card className="mx-auto max-w-md mt-8">
        <div className="p-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Layout Error</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was a problem loading this page layout.
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
};


// -----------------------
// Props
// -----------------------
type AppLayoutManagerProps = {
  children: ReactNode;
  routeLayout?: string;
  isAuthPage: boolean;
  isProctoringRoute: boolean;
  isFullscreenRoute: boolean;
  showLayout: boolean;
  forceLayoutOnAuthPage: boolean;
  isAdminRoute: boolean;
  isInstitutionsRoute: boolean;
  isDashboardRoute: boolean;
  isMarketplaceRoute: boolean;
  isLearningRoute: boolean;
  isCommunityRoute: boolean;
  isReportsRoute: boolean;
  isMarketingRoute: boolean;
  subscriptionTier: SubscriptionTier;
  isRouteLoading: boolean;
  role?: string | null;
  isTeacherApproved?: boolean | null;
  guardFallback: () => ReactNode;

  // ⭐ NEW — passed from _app.tsx
  showBreadcrumbs?: boolean;
};


// -----------------------
// Teacher Onboarding Gate
// -----------------------
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
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">
            Teacher onboarding
          </p>
          <h2 className="text-h3 font-semibold text-foreground">Complete your profile</h2>
          <p className="text-small text-muted-foreground">
            Your account is created but not approved yet. Share a quick profile so our team can unlock the teacher workspace for you.
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
      </form>
    </Card>
  );
}


// -----------------------
// Teacher Access Helper
// -----------------------
const useTeacherAccess = (role?: string | null, isTeacherApproved?: boolean | null) => {
  const router = useRouter();
  const isTeacherRoute = router.pathname.startsWith('/teacher');

  const teacherAccess = useMemo(() => {
    const canAccessTeacher = role === 'teacher' || role === 'admin';
    const isApproved = Boolean(isTeacherApproved);

    return {
      canAccessTeacher,
      isApproved,
      shouldRedirect: isTeacherRoute && role && !canAccessTeacher,
      showOnboarding: role === 'teacher' && !isApproved
    };
  }, [role, isTeacherApproved, isTeacherRoute]);

  useEffect(() => {
    if (teacherAccess.shouldRedirect) {
      void router.push('/restricted');
    }
  }, [teacherAccess.shouldRedirect, router]);

  return teacherAccess;
};


// -----------------------
// Layout Config Type
// -----------------------
type LayoutConfig = {
  type: string;
  component: React.ComponentType<{ children: ReactNode; userRole?: string }>;
};

const layoutComponentMap: Record<string, React.ComponentType<{ children: ReactNode; userRole?: string }>> = {
  admin: AdminLayout,
  teacher: TeacherLayout,
  institutions: InstitutionsLayout,
  dashboard: DashboardLayout,
  marketplace: MarketplaceLayout,
  learning: LearningLayout,
  community: CommunityLayout,
  reports: ReportsLayout,
  marketing: PublicMarketingLayout,
  profile: ProfileLayout,
  communication: CommunicationLayout,
  billing: BillingLayout,
  resources: ResourcesLayout,
  analytics: AnalyticsLayout,
  support: SupportLayout,
};

const resolveLayoutComponent = (
  layoutType?: string
): React.ComponentType<{ children: ReactNode; userRole?: string }> | null => {
  if (!layoutType) return null;
  return layoutComponentMap[layoutType] ?? null;
};


// -----------------------
// MAIN COMPONENT
// -----------------------
export function AppLayoutManager({
  children,
  routeLayout,
  isAuthPage,
  isProctoringRoute,
  isFullscreenRoute,
  showLayout,
  forceLayoutOnAuthPage,
  isAdminRoute,
  isInstitutionsRoute,
  isDashboardRoute,
  isMarketplaceRoute,
  isLearningRoute,
  isCommunityRoute,
  isReportsRoute,
  isMarketingRoute,
  subscriptionTier,
  isRouteLoading,
  role,
  isTeacherApproved,
  guardFallback,
  showBreadcrumbs,
}: AppLayoutManagerProps) {

  const router = useRouter();
  const teacherAccess = useTeacherAccess(role, isTeacherApproved);
  const teacherAccessRole = role ?? 'guest';


  // -----------------------
  // Teacher Content Switch
  // -----------------------
  const getTeacherContent = useCallback(() => {
    if (role === 'admin') {
      return (
        <TeacherLayout userRole={teacherAccessRole}>
          <TeacherProfile />
        </TeacherLayout>
      );
    }

    if (role === 'teacher') {
      return (
        <TeacherLayout userRole={teacherAccessRole}>
          {teacherAccess.isApproved ? children : <TeacherOnboardingGate />}
        </TeacherLayout>
      );
    }

    return guardFallback();
  }, [role, teacherAccessRole, teacherAccess.isApproved, children, guardFallback]);


  // -----------------------
  // Layout Mapping
  // -----------------------
  const fallbackLayoutType = useMemo(() => {
    if (isAdminRoute) return 'admin';
    if (router.pathname.startsWith('/teacher')) return 'teacher';
    if (isInstitutionsRoute) return 'institutions';
    if (isMarketplaceRoute) return 'marketplace';
    if (isLearningRoute) return 'learning';
    if (isCommunityRoute) return 'community';
    if (isReportsRoute) return 'reports';
    if (isMarketingRoute) return 'marketing';
    if (isDashboardRoute) return 'dashboard';
    return 'dashboard';
  }, [
    isAdminRoute,
    isInstitutionsRoute,
    isMarketplaceRoute,
    isLearningRoute,
    isCommunityRoute,
    isReportsRoute,
    isMarketingRoute,
    isDashboardRoute,
    router.pathname,
  ]);


  // -----------------------
  // Which Layout Active?
  // -----------------------
  const resolvedLayoutType = useMemo(
    () => routeLayout ?? fallbackLayoutType,
    [routeLayout, fallbackLayoutType]
  );

  const activeLayout = useMemo<LayoutConfig | null>(() => {
    const component = resolveLayoutComponent(resolvedLayoutType) ?? resolveLayoutComponent(fallbackLayoutType);
    if (!component) return null;
    return {
      type: resolvedLayoutType,
      component,
    };
  }, [resolvedLayoutType, fallbackLayoutType]);


  // -----------------------
  // Apply Wrappers
  // -----------------------
  const getNakedContent = (content: ReactNode) => {
    // For specific auth pages that should be truly naked (no AuthLayout)
    const nakedAuthRoutes = ['/forgot-password', '/update-password'];
    if (nakedAuthRoutes.includes(router.pathname)) {
      return content;
    }
    if (isAuthPage) {
      const authCopy: Record<string, { title: string; subtitle: string }> = {
        '/login': { title: 'Welcome back', subtitle: 'Sign in to continue your IELTS prep journey.' },
        '/login/index': { title: 'Welcome back', subtitle: 'Sign in to continue your IELTS prep journey.' },
        '/login/email': { title: 'Sign in with email', subtitle: 'Use your email and password to access your account.' },
        '/login/phone': { title: 'Sign in with phone', subtitle: 'Get a one-time code on your phone and continue securely.' },
        '/login/password': { title: 'Set new password', subtitle: 'Create a secure password to protect your account.' },
        '/signup': { title: 'Create your account', subtitle: 'Choose a sign-up method and start improving your band score.' },
        '/signup/index': { title: 'Create your account', subtitle: 'Choose a sign-up method and start improving your band score.' },
        '/signup/email': { title: 'Sign up with email', subtitle: 'Create your account using email verification.' },
        '/signup/phone': { title: 'Sign up with phone', subtitle: 'Create your account with a secure SMS verification code.' },
        '/signup/password': { title: 'Create password', subtitle: 'Set a strong password to finish your account setup.' },
        '/signup/verify': { title: 'Verify your email', subtitle: 'Check your inbox and confirm your email to continue.' },
        '/auth/forgot': { title: 'Forgot password', subtitle: 'We will send a reset link to your email address.' },
        '/auth/reset': { title: 'Reset password', subtitle: 'Choose a new password and sign in again.' },
        '/auth/verify': { title: 'Email verification', subtitle: 'Finalizing your verification and secure sign-in.' },
        '/auth/confirm': { title: 'Confirm your email', subtitle: 'We are validating your email confirmation link.' },
        '/auth/mfa': { title: 'Two-factor authentication', subtitle: 'Enter the 6-digit code from your authenticator app.' },
        '/forgot-password': { title: 'Forgot password', subtitle: 'We will send a reset link to your email address.' },
        '/update-password': { title: 'Update password', subtitle: 'Set a new password and get back into your account.' },
      };

      const copy = authCopy[router.pathname] ?? {
        title: 'Welcome',
        subtitle: 'Secure sign in and sign up experience across all devices.',
      };

      return <AuthLayout title={copy.title} subtitle={copy.subtitle}>{content}</AuthLayout>;
    }
    if (isProctoringRoute) return <ProctoringLayout>{content}</ProctoringLayout>;
    if (isFullscreenRoute) return content;
    return content;
  };

  const content = useMemo(() => {
    if (!showLayout) {
      return getNakedContent(children);
    }

    if (activeLayout) {
      if (activeLayout.type === 'teacher') {
        return getTeacherContent();
      }

      const LayoutComponent = activeLayout.component;
      return <LayoutComponent userRole={role}>{children}</LayoutComponent>;
    }

    return <DashboardLayout userRole={role}>{children}</DashboardLayout>;
  }, [
    showLayout,
    isFullscreenRoute,
    activeLayout,
    role,
    children,
    getTeacherContent,
    isAuthPage,
    isProctoringRoute,
  ]);


  // -----------------------
  // Final Layout Wrap
  // -----------------------
  const shouldWrapInMainLayout = forceLayoutOnAuthPage || showLayout;

  return (
    <LayoutErrorBoundary>
      <GlobalPlanGuard />

      {shouldWrapInMainLayout ? (
        <Layout>
          <ImpersonationBanner />
          {showBreadcrumbs && <BreadcrumbBar />}
          {content}
        </Layout>
      ) : (
        <>
          {/* Hide banner on auth pages to prevent extra height */}
          {!isAuthPage && <ImpersonationBanner />}
          {content}
        </>
      )}

      <AuthAssistant />
      <SidebarAI />
      <UpgradeModal />
      <RouteLoadingOverlay active={isRouteLoading} tier={subscriptionTier} />
    </LayoutErrorBoundary>
  );
}

export default AppLayoutManager;
