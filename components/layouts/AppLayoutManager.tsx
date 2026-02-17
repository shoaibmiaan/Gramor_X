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
  isAuthPage: boolean;
  isProctoringRoute: boolean;
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
  guard?: (role?: string | null, isTeacherApproved?: boolean | null) => boolean;
  getContent?: (
    role?: string | null,
    isTeacherApproved?: boolean | null,
    children?: ReactNode,
    guardFallback?: () => ReactNode
  ) => ReactNode;
};


// -----------------------
// MAIN COMPONENT
// -----------------------
export function AppLayoutManager({
  children,
  isAuthPage,
  isProctoringRoute,
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
  const pathname = router.pathname;
  const teacherAccess = useTeacherAccess(role, isTeacherApproved);
  const isTeacherRoute = pathname.startsWith('/teacher');
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
  const layoutConfigs: LayoutConfig[] = useMemo(
    () => [
      { type: 'admin', component: AdminLayout, guard: () => isAdminRoute },
      { type: 'teacher', component: TeacherLayout, guard: () => isTeacherRoute, getContent: () => getTeacherContent() },
      { type: 'institutions', component: InstitutionsLayout, guard: () => isInstitutionsRoute },
      { type: 'dashboard', component: DashboardLayout, guard: () => isDashboardRoute },
      { type: 'marketplace', component: MarketplaceLayout, guard: () => isMarketplaceRoute },
      { type: 'learning', component: LearningLayout, guard: () => isLearningRoute },
      { type: 'community', component: CommunityLayout, guard: () => isCommunityRoute },
      { type: 'reports', component: ReportsLayout, guard: () => isReportsRoute },
      { type: 'marketing', component: PublicMarketingLayout, guard: () => isMarketingRoute },
      { type: 'profile', component: ProfileLayout, guard: () => pathname.startsWith('/profile') || pathname.startsWith('/user') },
      { type: 'communication', component: CommunicationLayout, guard: () => pathname.startsWith('/messages') || pathname.startsWith('/chat') || pathname.startsWith('/inbox') },
      { type: 'billing', component: BillingLayout, guard: () => pathname.startsWith('/billing') || pathname.startsWith('/payment') || pathname.startsWith('/subscription') },
      { type: 'resources', component: ResourcesLayout, guard: () => pathname.startsWith('/resources') || pathname.startsWith('/library') },
      { type: 'analytics', component: AnalyticsLayout, guard: () => pathname.startsWith('/analytics') || pathname.startsWith('/stats') },
      { type: 'support', component: SupportLayout, guard: () => pathname.startsWith('/support') || pathname.startsWith('/help') },
    ],
    [
      isAdminRoute,
      isTeacherRoute,
      isInstitutionsRoute,
      isDashboardRoute,
      isMarketplaceRoute,
      isLearningRoute,
      isCommunityRoute,
      isReportsRoute,
      isMarketingRoute,
      pathname,
      getTeacherContent,
    ]
  );


  // -----------------------
  // Which Layout Active?
  // -----------------------
  const activeLayout = useMemo(
    () => layoutConfigs.find((config) => config.guard?.(role, isTeacherApproved)) || null,
    [layoutConfigs, role, isTeacherApproved]
  );


  // -----------------------
  // Apply Wrappers
  // -----------------------
  const getNakedContent = (
    auth: boolean,
    proctoring: boolean,
    content: ReactNode
  ) => {
    if (auth) return <AuthLayout>{content}</AuthLayout>;
    if (proctoring) return <ProctoringLayout>{content}</ProctoringLayout>;
    return content;
  };

  const content = useMemo(() => {
    if (!showLayout) {
      return getNakedContent(isAuthPage, isProctoringRoute, children);
    }

    if (activeLayout) {
      if (activeLayout.getContent) {
        return activeLayout.getContent(role, isTeacherApproved, children, guardFallback);
      }

      const LayoutComponent = activeLayout.component;
      return <LayoutComponent userRole={role}>{children}</LayoutComponent>;
    }

    return children;
  }, [
    showLayout,
    isAuthPage,
    isProctoringRoute,
    activeLayout,
    role,
    isTeacherApproved,
    children,
    guardFallback,
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

          {/* ⭐ Breadcrumb Bar V2 — inserted globally under header chrome */}
          {showBreadcrumbs && <BreadcrumbBar />}

          {content}
        </Layout>
      ) : (
        <>
          <ImpersonationBanner />
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
