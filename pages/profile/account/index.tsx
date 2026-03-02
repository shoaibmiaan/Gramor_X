'use client';

import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';

import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { withPageAuth } from '@/lib/requirePageAuth';

import { getPlan, isPaidPlan, type PlanId } from '@/types/pricing';

import {
  formatSubscriptionStatus,
  mapSubscriptionStatusToVariant,
  type SubscriptionStatus,
} from '@/lib/subscription';

import {
  CheckCircle,
  History,
  Settings as SettingsIcon,
  Shield,
  Bell,
  Globe,
  Key,
  Crown,
  Users,
  Activity,
  MessageSquare,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type BillingSummary = {
  plan: PlanId;
  status: SubscriptionStatus; // ✅ centralized type (no Exclude)
  renewsAt?: string;
  trialEndsAt?: string;
};

type BillingSummaryResponse =
  | {
      ok: true;
      summary: BillingSummary;
      customerId?: string | null;
      needsStripeSetup?: boolean;
    }
  | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function AccountHubPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isTeacher, setIsTeacher] = React.useState(false);

  const [billingLoading, setBillingLoading] = React.useState(true);
  const [billingError, setBillingError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);

  const [portalAvailable, setPortalAvailable] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);

  const [activityStats, setActivityStats] = React.useState({
    totalActivities: 0,
    recentActivities: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });

  /* ------------------------------------------------------------------ */
  /* Billing Summary Fetch */
  /* ------------------------------------------------------------------ */

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setBillingLoading(true);
        setBillingError(null);

        const response = await fetch('/api/billing/summary', {
          credentials: 'include',
        });

        const data: BillingSummaryResponse = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            (data as any)?.error || response.statusText || 'Failed to load billing',
          );
        }

        if (cancelled) return;

        setSummary(data.summary);
        setPortalAvailable(Boolean(data.customerId) && !data.needsStripeSetup);
      } catch (error) {
        if (cancelled) return;
        setBillingError((error as Error).message || 'Failed to load billing');
        setSummary(null);
        setPortalAvailable(false);
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Profile + Activity Load */
  /* ------------------------------------------------------------------ */

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      const user = sessionData.session?.user;
      setEmail(user?.email ?? null);

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, teacher_approved')
        .eq('id', user.id)
        .single();

      if (profile) {
        setIsAdmin(profile.role === 'admin');
        setIsTeacher(profile.teacher_approved === true || profile.role === 'teacher');
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [activityCount, recentCount, pendingTasks, completedTasks] = await Promise.all([
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .eq('status', 'pending'),
        supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .eq('status', 'completed'),
      ]);

      if (!mounted) return;

      setActivityStats({
        totalActivities: activityCount.count || 0,
        recentActivities: recentCount.count || 0,
        pendingTasks: pendingTasks.count || 0,
        completedTasks: completedTasks.count || 0,
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Billing Portal */
  /* ------------------------------------------------------------------ */

  const openPortal = React.useCallback(async () => {
    try {
      setPortalLoading(true);
      setBillingError(null);

      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });

      const payload = await response.json();

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || 'Failed to open billing portal');
      }

      window.location.href = payload.url;
    } catch (error) {
      setBillingError((error as Error).message || 'Failed to open billing portal');
      setPortalLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* Derived State */
  /* ------------------------------------------------------------------ */

  const planDefinition = React.useMemo(
    () => (summary ? getPlan(summary.plan) : null),
    [summary],
  );

  const isPremiumPlan = React.useMemo(
    () => (summary ? isPaidPlan(summary.plan) : false),
    [summary],
  );

  /* ------------------------------------------------------------------ */
  /* Render */
  /* ------------------------------------------------------------------ */

  return (
    <>
      <Head>
        <title>Account &amp; Settings · GramorX</title>
      </Head>

      <main className="bg-background py-12">
        <Container className="space-y-8">

          {/* Header */}
          <header>
            <h1 className="flex items-center gap-3 text-h2 font-bold">
              <SettingsIcon className="h-7 w-7" />
              Account &amp; Settings
            </h1>
            <p className="mt-2 text-small text-muted-foreground">
              Central hub for your account, subscription, and activity.
            </p>
          </header>

          {/* Plan & Billing Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-semibold">
                  <Crown className="h-5 w-5" />
                  Plan & Billing
                </h2>

                {billingLoading ? (
                  <p className="mt-2 text-small text-muted-foreground">Loading...</p>
                ) : billingError ? (
                  <p className="mt-2 text-small text-danger">{billingError}</p>
                ) : summary ? (
                  <>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant={mapSubscriptionStatusToVariant(summary.status)}>
                        {formatSubscriptionStatus(summary.status)}
                      </Badge>

                      {planDefinition && (
                        <span className="text-small text-muted-foreground">
                          {planDefinition.name}
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      {isPremiumPlan ? (
                        portalAvailable ? (
                          <Button
                            onClick={openPortal}
                            loading={portalLoading}
                            variant="soft"
                            tone="accent"
                          >
                            Manage billing
                          </Button>
                        ) : (
                          <Button asChild variant="soft">
                            <Link href="/profile/account/billing">
                              Open billing hub
                            </Link>
                          </Button>
                        )
                      ) : (
                        <Button asChild variant="soft" tone="accent">
                          <Link href="/pricing">Upgrade to Premium</Link>
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-small text-muted-foreground">
                    No active subscription found.
                  </p>
                )}
              </div>
            </div>
          </Card>

        </Container>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Auth Guard */
/* ------------------------------------------------------------------ */

export const getServerSideProps: GetServerSideProps = withPageAuth();
