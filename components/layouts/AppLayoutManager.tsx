import { useCallback, useEffect } from 'react';
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

import type { ReactNode } from 'react';

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
};

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
}: AppLayoutManagerProps) {
  const router = useRouter();
  const pathname = router.pathname;

  const isTeacherRoute = pathname.startsWith('/teacher');
  const teacherAccessRole = role ?? 'guest';
  const canAccessTeacher = role === 'teacher' || role === 'admin';
  const isTeacherApprovedFlag = Boolean(isTeacherApproved);

  useEffect(() => {
    if (isTeacherRoute && role && !canAccessTeacher) {
      void router.push('/restricted');
    }
  }, [canAccessTeacher, isTeacherRoute, role, router]);

  const renderGuardFallback = () => guardFallback();

  let content = children;

  if (showLayout) {
    if (isAdminRoute) {
      content = <AdminLayout>{children}</AdminLayout>;
    } else if (isTeacherRoute) {
      if (role === 'admin') {
        content = (
          <TeacherLayout userRole={teacherAccessRole}>
            <TeacherProfile />
          </TeacherLayout>
        );
      } else if (role === 'teacher') {
        content = (
          <TeacherLayout userRole={teacherAccessRole}>
            {isTeacherApprovedFlag ? <TeacherProfile /> : <TeacherOnboardingGate />}
          </TeacherLayout>
        );
      } else {
        content = renderGuardFallback();
      }
    } else if (isInstitutionsRoute) {
      content = <InstitutionsLayout>{children}</InstitutionsLayout>;
    } else if (isDashboardRoute) {
      content = <DashboardLayout>{children}</DashboardLayout>;
    } else if (isMarketplaceRoute) {
      content = <MarketplaceLayout>{children}</MarketplaceLayout>;
    } else if (isLearningRoute) {
      content = <LearningLayout>{children}</LearningLayout>;
    } else if (isCommunityRoute) {
      content = <CommunityLayout>{children}</CommunityLayout>;
    } else if (isReportsRoute) {
      content = <ReportsLayout>{children}</ReportsLayout>;
    } else if (isMarketingRoute) {
      content = <PublicMarketingLayout>{children}</PublicMarketingLayout>;
    }
  }

  const nakedContent = isAuthPage ? (
    <AuthLayout>{children}</AuthLayout>
  ) : isProctoringRoute ? (
    <ProctoringLayout>{children}</ProctoringLayout>
  ) : (
    children
  );

  return (
    <>
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
      <RouteLoadingOverlay active={isRouteLoading} tier={subscriptionTier} />
    </>
  );
}

export default AppLayoutManager;
