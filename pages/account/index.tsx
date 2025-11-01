// pages/settings/index.tsx
'use client';

import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Container } from "@/components/design-system/Container";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { Card } from "@/components/design-system/Card";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import { getPlan, isPaidPlan, type PlanId } from "@/types/pricing";

type BillingSummary = {
  plan: PlanId;
  status:
    | "active"
    | "trialing"
    | "canceled"
    | "incomplete"
    | "past_due"
    | "unpaid"
    | "paused";
  renewsAt?: string;
  trialEndsAt?: string;
};

type BillingSummaryResponse =
  | { ok: true; summary: BillingSummary; customerId?: string | null; needsStripeSetup?: boolean }
  | { ok: false; error: string };

export default function SettingsHubPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);  // Admin check
  const [billingLoading, setBillingLoading] = React.useState(true);
  const [billingError, setBillingError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<BillingSummary | null>(null);
  const [portalAvailable, setPortalAvailable] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);

  const statusVariant = React.useCallback((status: BillingSummary["status"]): React.ComponentProps<typeof Badge>["variant"] => {
    switch (status) {
      case "active":
        return "success";
      case "trialing":
        return "info";
      case "past_due":
      case "incomplete":
        return "warning";
      case "unpaid":
        return "danger";
      case "paused":
        return "secondary";
      case "canceled":
      default:
        return "neutral";
    }
  }, []);

  const formatStatus = React.useCallback((status: BillingSummary["status"]) => {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setBillingLoading(true);
        setBillingError(null);

        const response = await fetch("/api/billing/summary", { credentials: "include" });
        const data: BillingSummaryResponse = await response.json();

        if (!response.ok) {
          throw new Error(response.statusText || "Failed to load billing");
        }

        if (!data.ok) {
          throw new Error(data.error || "Failed to load billing");
        }

        if (cancelled) return;

        setSummary(data.summary);
        const canOpenPortal = Boolean(data.customerId) && !data.needsStripeSetup;
        setPortalAvailable(canOpenPortal);
      } catch (error) {
        if (cancelled) return;
        setBillingError((error as Error).message || "Failed to load billing");
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

  const openPortal = React.useCallback(async () => {
    try {
      setBillingError(null);
      setPortalLoading(true);

      const response = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error((payload && payload.error) || response.statusText || "Failed to open billing portal");
      }

      const url = typeof payload?.url === "string" ? payload.url : null;
      if (!url) {
        throw new Error("Failed to open billing portal");
      }

      window.location.href = url;
    } catch (error) {
      setBillingError((error as Error).message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  }, []);

  const planDefinition = React.useMemo(() => (summary ? getPlan(summary.plan) : null), [summary]);
  const isPremiumPlan = React.useMemo(() => (summary ? isPaidPlan(summary.plan) : false), [summary]);
  const dateFormatter = React.useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }), []);
  const planMeta = React.useMemo(() => {
    if (!summary) return null;
    const parts: string[] = [];
    if (summary.renewsAt) {
      parts.push(`Renews ${dateFormatter.format(new Date(summary.renewsAt))}`);
    }
    if (summary.trialEndsAt) {
      parts.push(`Trial ends ${dateFormatter.format(new Date(summary.trialEndsAt))}`);
    }
    return parts;
  }, [summary, dateFormatter]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setEmail(data.session?.user?.email ?? null);

      // Check if the user is an admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session?.user?.id)
        .single();

      if (profile?.role === 'admin') setIsAdmin(true);
    })();
    return () => { mounted = false; };
  }, []);

  const safePush = (href: string) => {
    if (router.asPath !== href) void router.push(href);
  };

  const handleReset = async () => {
    if (!email || sending) return;
    setSending(true);
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL || "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/login/reset`,
      });
      if (error) {
        alert(error.message);
      } else {
        alert("Password reset email sent.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Settings · GramorX</title>
        <meta
          name="description"
          content="Manage language, notifications, accessibility and account settings."
        />
      </Head>

      <main className="bg-lightBg py-16 dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container className="space-y-6">
          <header className="mb-4">
            <h1 className="text-h2 font-bold text-foreground">Settings</h1>
            <p className="text-small text-muted-foreground">
              Tweak your experience and account preferences.
            </p>
          </header>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Plan & Billing */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-small font-medium text-foreground">Plan &amp; Billing</h2>
                  <p className="mt-1 text-small text-muted-foreground">
                    Check your subscription status and manage billing details.
                  </p>
                </div>
                {isPremiumPlan && <Badge variant="accent">Premium</Badge>}
              </div>

              <div className="mt-3 space-y-3">
                {billingLoading ? (
                  <p className="text-small text-muted-foreground">Checking your plan…</p>
                ) : billingError ? (
                  <p className="text-small text-danger">{billingError}</p>
                ) : summary ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(summary.status)}>{formatStatus(summary.status)}</Badge>
                      {planDefinition && (
                        <span className="text-small text-muted-foreground">{planDefinition.name}</span>
                      )}
                    </div>

                    {planMeta && planMeta.length > 0 && (
                      <p className="text-caption text-muted-foreground">
                        {planMeta.map((part, index) => (
                          <React.Fragment key={`${part}-${index}`}>
                            {index > 0 && <span aria-hidden="true"> · </span>}
                            <span>{part}</span>
                          </React.Fragment>
                        ))}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      {isPremiumPlan ? (
                        portalAvailable ? (
                          <Button onClick={openPortal} loading={portalLoading} variant="soft" tone="accent">
                            {portalLoading ? "Opening…" : "Manage billing"}
                          </Button>
                        ) : (
                          <Button asChild variant="soft">
                            <Link href="/pricing">Change plan</Link>
                          </Button>
                        )
                      ) : (
                        <Button asChild variant="soft" tone="accent">
                          <Link href="/pricing">Upgrade to Premium</Link>
                        </Button>
                      )}

                      {!isPremiumPlan && (
                        <span className="text-caption text-muted-foreground">
                          Unlock unlimited mock exams, full AI evaluations, and coaching tools.
                        </span>
                      )}
                    </div>

                    {!portalAvailable && isPremiumPlan && (
                      <p className="text-caption text-muted-foreground">
                        The billing portal is temporarily unavailable. Email {" "}
                        <a className="underline" href="mailto:support@gramorx.com">
                          support@gramorx.com
                        </a>{" "}
                        to update or cancel your plan.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-small text-muted-foreground">
                    We couldn’t find an active subscription yet. Upgrade to unlock Premium perks.
                  </p>
                )}
              </div>
            </div>

            {/* Language */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-small font-medium text-foreground">Language</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Switch between English and Urdu. We remember your choice.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="soft"
                  onClick={(e) => {
                    e.preventDefault();
                    if (router.asPath !== "/settings/language") {
                      safePush("/settings/language");
                    }
                  }}
                >
                  Open Language Settings
                </Button>
                <Link href="/settings/language" prefetch={false} className="sr-only">
                  Language (link for SEO)
                </Link>
              </div>
            </div>

            {/* Notifications (placeholder) */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-small font-medium text-foreground">Notifications</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Daily task reminders and challenge nudges.
              </p>
              <div className="mt-3 text-caption text-muted-foreground">
                Coming soon — wired to <code className="font-mono">/api/notifications/nudge</code>.
              </div>
            </div>

            {/* Accessibility */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-small font-medium text-foreground">Accessibility</h2>
              <p className="mt-1 text-small text-muted-foreground">
                High contrast themes, keyboard checks, and screen reader hints.
              </p>
              <div className="mt-3">
                <Button
                  variant="soft"
                  onClick={(e) => {
                    e.preventDefault();
                    safePush("/settings/accessibility");
                  }}
                >
                  Open Accessibility
                </Button>
                <Link href="/settings/accessibility" prefetch={false} className="sr-only">
                  Accessibility (link for SEO)
                </Link>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-small font-medium text-foreground">Security</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Reset your password.{" "}
                {email ? `Email on file: ${email}` : "No email on file."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="solid"
                  tone="accent"
                  onClick={handleReset}
                  disabled={!email || sending}
                  loading={sending}
                >
                  Send reset email
                </Button>
                {!email && (
                  <span className="text-caption text-muted-foreground">
                    Add an email to your account first.
                  </span>
                )}
              </div>
            </div>

            {/* Premium PIN */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-small font-medium text-foreground">Premium PIN</h2>
              <p className="mt-1 text-small text-muted-foreground">
                Redeem a one-time access PIN shared by the GramorX team to unlock premium features
                without entering payment details.
              </p>
              <div className="mt-3">
                <Button asChild variant="soft">
                  <Link href="/account/redeem">Redeem PIN</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Admin Panel Link */}
          {isAdmin && (
            <Card className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 card-surface">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Admin Panel</h2>
                  <Badge variant="secondary">Admin</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage teachers, partners, pricing, and reports.
                </p>
              </div>
              <Link href="/admin" className="nav-pill">
                <Button className="btn">Open Admin Panel</Button>
              </Link>
            </Card>
          )}
        </Container>
      </main>
    </>
  );
}
