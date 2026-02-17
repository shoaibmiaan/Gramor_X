'use client';

import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { getPlan, isPaidPlan, type PlanId } from '@/types/pricing';

import {
  Timeline,
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

type BillingSummary = {
  plan: PlanId;
  status:
    | 'active'
    | 'trialing'
    | 'canceled'
    | 'incomplete'
    | 'past_due'
    | 'unpaid'
    | 'paused';
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

  const statusVariant = React.useCallback(
    (status: BillingSummary['status']): React.ComponentProps<
      typeof Badge
    >['variant'] => {
      switch (status) {
        case 'active':
          return 'success';
        case 'trialing':
          return 'info';
        case 'past_due':
        case 'incomplete':
          return 'warning';
        case 'unpaid':
          return 'danger';
        case 'paused':
          return 'secondary';
        case 'canceled':
        default:
          return 'neutral';
      }
    },
    [],
  );

  const formatStatus = React.useCallback(
    (status: BillingSummary['status']) =>
      status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    [],
  );

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

        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to load billing');
        }

        if (!data.ok) {
          throw new Error(data.error || 'Failed to load billing');
        }

        if (cancelled) return;

        setSummary(data.summary);
        const canOpenPortal =
          Boolean(data.customerId) && !data.needsStripeSetup;
        setPortalAvailable(canOpenPortal);
      } catch (error) {
        if (cancelled) return;
        setBillingError(
          (error as Error).message || 'Failed to load billing',
        );
        setSummary(null);
        setPortalAvailable(false);
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      setEmail(sessionData.session?.user?.email ?? null);

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, teacher_approved')
        .eq('id', sessionData.session?.user?.id)
        .single();

      if (profile) {
        setIsAdmin(profile.role === 'admin');
        setIsTeacher(
          profile.teacher_approved === true ||
            profile.role === 'teacher',
        );
      }

      if (sessionData.session?.user?.id) {
        const userId = sessionData.session.user.id;

        const { count: activityCount } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { count: recentCount } = await supabase
          .from('user_activities')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', weekAgo.toISOString());

        const { count: pendingTasks } = await supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .eq('status', 'pending');

        const { count: completedTasks } = await supabase
          .from('task_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .eq('status', 'completed');

        if (mounted) {
          setActivityStats({
            totalActivities: activityCount || 0,
            recentActivities: recentCount || 0,
            pendingTasks: pendingTasks || 0,
            completedTasks: completedTasks || 0,
          });
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const openPortal = React.useCallback(async () => {
    try {
      setBillingError(null);
      setPortalLoading(true);

      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          (payload && payload.error) ||
            response.statusText ||
            'Failed to open billing portal',
        );
      }

      const url =
        typeof payload?.url === 'string' ? payload.url : null;
      if (!url) {
        throw new Error('Failed to open billing portal');
      }

      window.location.href = url;
    } catch (error) {
      setBillingError(
        (error as Error).message || 'Failed to open billing portal',
      );
      setPortalLoading(false);
    }
  }, []);

  const planDefinition = React.useMemo(
    () => (summary ? getPlan(summary.plan) : null),
    [summary],
  );
  const isPremiumPlan = React.useMemo(
    () => (summary ? isPaidPlan(summary.plan) : false),
    [summary],
  );
  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }),
    [],
  );
  const planMeta = React.useMemo(() => {
    if (!summary) return null;
    const parts: string[] = [];
    if (summary.renewsAt) {
      parts.push(
        `Renews ${dateFormatter.format(new Date(summary.renewsAt))}`,
      );
    }
    if (summary.trialEndsAt) {
      parts.push(
        `Trial ends ${dateFormatter.format(
          new Date(summary.trialEndsAt),
        )}`,
      );
    }
    return parts;
  }, [summary, dateFormatter]);

  const safePush = (href: string) => {
    if (router.asPath !== href) void router.push(href);
  };

  const handleReset = async () => {
    if (!email || sending) return;
    setSending(true);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || '';
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${origin}/login/reset`,
        },
      );
      if (error) {
        alert(error.message);
      } else {
        alert('Password reset email sent.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Account &amp; Settings · GramorX</title>
        <meta
          name="description"
          content="Central hub for your GramorX account: plan, activity, security, and settings shortcuts."
        />
      </Head>

      <main className="bg-background py-16 text-foreground">
        <Container className="space-y-8">
          <header className="mb-6">
            <h1 className="flex items-center gap-3 text-h2 font-bold">
              <SettingsIcon className="h-8 w-8" />
              Account &amp; Settings
            </h1>
            <p className="mt-2 text-small text-muted-foreground">
              This is your home for anything related to your account — plan,
              activity, security, and shortcuts into all settings pages.
            </p>
          </header>

          {/* Quick Stats Bar */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-small text-muted-foreground">
                    Total Activities
                  </p>
                  <p className="text-h3 font-bold">
                    {activityStats.totalActivities}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-small text-muted-foreground">
                    Recent (7d)
                  </p>
                  <p className="text-h3 font-bold">
                    {activityStats.recentActivities}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/20 p-2 text-warning">
                  {/* Simple square icon replacement (Assignment) */}
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-small text-muted-foreground">
                    Pending Tasks
                  </p>
                  <p className="text-h3 font-bold">
                    {activityStats.pendingTasks}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-small text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-h3 font-bold">
                    {activityStats.completedTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards grid */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Activity Log */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Timeline className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-small font-medium text-foreground">
                      Activity log
                    </h2>
                    <p className="mt-1 text-small text-muted-foreground">
                      Unified timeline of your mocks, practice, and streak
                      events.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    activityStats.recentActivities > 0
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {activityStats.recentActivities} new
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-small">
                  <span className="text-muted-foreground">
                    Recent activities:
                  </span>
                  <span className="font-medium">
                    {activityStats.recentActivities}
                  </span>
                </div>
                <div className="flex items-center justify-between text-small">
                  <span className="text-muted-foreground">
                    Total logged:
                  </span>
                  <span className="font-medium">
                    {activityStats.totalActivities}
                  </span>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                    Quick actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="soft"
                      size="sm"
                      className="min-w-[120px] flex-1"
                    >
                      <Link href="/account/activity">
                        <Timeline className="mr-2 h-3 w-3" />
                        View timeline
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="soft"
                      size="sm"
                      className="min-w-[120px] flex-1"
                    >
                      <Link href="/mock">
                        <History className="mr-2 h-3 w-3" />
                        Open mocks
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan & Billing */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-small font-medium text-foreground">
                      Plan &amp; billing
                    </h2>
                    <p className="mt-1 text-small text-muted-foreground">
                      Check subscription status and manage payments from one
                      place.
                    </p>
                  </div>
                </div>
                {isPremiumPlan && <Badge variant="accent">Premium</Badge>}
              </div>

              <div className="space-y-3">
                {billingLoading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 rounded bg-muted" />
                    <div className="h-4 w-2/3 rounded bg-muted" />
                  </div>
                ) : billingError ? (
                  <p className="text-small text-danger">{billingError}</p>
                ) : summary ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(summary.status)}>
                        {formatStatus(summary.status)}
                      </Badge>
                      {planDefinition && (
                        <span className="text-small text-muted-foreground">
                          {planDefinition.name}
                        </span>
                      )}
                    </div>

                    {planMeta && planMeta.length > 0 && (
                      <p className="text-caption text-muted-foreground">
                        {planMeta.map((part, index) => (
                          <React.Fragment key={`${part}-${index}`}>
                            {index > 0 && (
                              <span aria-hidden="true"> · </span>
                            )}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      {isPremiumPlan ? (
                        portalAvailable ? (
                          <Button
                            onClick={openPortal}
                            loading={portalLoading}
                            variant="soft"
                            tone="accent"
                            className="flex-1"
                          >
                            {portalLoading
                              ? 'Opening…'
                              : 'Manage billing'}
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="soft"
                            className="flex-1"
                          >
                            <Link href="/profile/account/billing">
                              Open billing hub
                            </Link>
                          </Button>
                        )
                      ) : (
                        <Button
                          asChild
                          variant="soft"
                          tone="accent"
                          className="flex-1"
                        >
                          <Link href="/pricing">
                            Upgrade to Premium
                          </Link>
                        </Button>
                      )}
                    </div>

                    {!isPremiumPlan && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Unlock unlimited mocks, full AI feedback, and advanced
                        analytics.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-small text-muted-foreground">
                    No active subscription found.
                  </p>
                )}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Language
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Switch between English and Urdu interface.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="soft"
                  onClick={() => safePush('/settings/language')}
                  className="w-full"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  Language settings
                </Button>
              </div>
            </div>

            {/* Notifications */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Notifications
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Daily reminders and nudges for your study rhythm.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-small">
                  <span>Email notifications</span>
                  <Badge variant="success">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between text-small">
                  <span>WhatsApp / Push</span>
                  <Badge variant="neutral">Configured in settings</Badge>
                </div>
                <Button
                  variant="soft"
                  onClick={() => safePush('/settings/notifications')}
                  className="mt-3 w-full"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Open notification settings
                </Button>
              </div>
            </div>

            {/* Accessibility */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <SettingsIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Accessibility
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    High contrast, focus ring tuning, and reduced motion.
                  </p>
                </div>
              </div>
              <Button
                variant="soft"
                onClick={() => safePush('/settings/accessibility')}
                className="w-full"
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Accessibility settings
              </Button>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Security
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    MFA, active sessions, and login history.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-small">
                  <span className="text-muted-foreground">
                    Email on file:
                  </span>
                  <span
                    className="max-w-[150px] truncate font-medium"
                    title={email || ''}
                  >
                    {email || 'Not set'}
                  </span>
                </div>
                <Button
                  variant="solid"
                  tone="accent"
                  onClick={handleReset}
                  disabled={!email || sending}
                  loading={sending}
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Reset password
                </Button>
                <Button
                  variant="soft"
                  onClick={() => safePush('/settings/security')}
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Security settings
                </Button>
              </div>
            </div>

            {/* Premium PIN */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Premium PIN
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Redeem a PIN to unlock premium without adding a card.
                  </p>
                </div>
              </div>
              <Button asChild variant="soft" className="w-full">
                <Link href="/account/redeem">
                  <Key className="mr-2 h-4 w-4" />
                  Redeem premium PIN
                </Link>
              </Button>
            </div>

            {/* Teacher Panel (if teacher) */}
            {isTeacher && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-small font-medium text-foreground">
                      Teacher panel
                    </h2>
                    <p className="mt-1 text-small text-muted-foreground">
                      Manage students, assignments, and feedback.
                    </p>
                  </div>
                </div>
                <Button asChild variant="soft" className="w-full">
                  <Link href="/teacher/dashboard">
                    <Users className="mr-2 h-4 w-4" />
                    Open teacher panel
                  </Link>
                </Button>
              </div>
            )}

            {/* Help & Support */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-small font-medium text-foreground">
                    Help &amp; support
                  </h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Get help, send feedback, or report an issue.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Button
                  asChild
                  variant="soft"
                  className="w-full"
                  size="sm"
                >
                  <Link href="/support">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact support
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Link href="/feedback">Send feedback</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Admin Panel Link */}
          {isAdmin && (
            <Card className="card-surface border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/20 p-2 text-primary">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="flex items-center gap-2 text-lg font-semibold">
                        Admin control panel
                        <Badge variant="primary" className="ml-2">
                          Admin
                        </Badge>
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Manage teachers, partners, pricing, and analytics.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Activities: {activityStats.totalActivities}
                    </Badge>
                    <Badge variant="outline">
                      Pending tasks: {activityStats.pendingTasks}
                    </Badge>
                    <Badge variant="outline">Reports: 12</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/admin" className="flex-1">
                    <Button
                      variant="solid"
                      tone="primary"
                      className="w-full"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Admin dashboard
                    </Button>
                  </Link>
                  <Link href="/admin/analytics" className="flex-1">
                    <Button variant="soft" className="w-full">
                      View analytics
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Data Management */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold">Data &amp; privacy</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Export your activity data or request account deletion.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  Export activity log
                </Button>
                <Button variant="outline" size="sm" tone="danger">
                  Delete account
                </Button>
              </div>
            </div>
          </Card>
        </Container>
      </main>
    </>
  );
}
