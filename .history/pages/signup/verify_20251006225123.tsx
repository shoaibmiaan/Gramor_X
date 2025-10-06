'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { MailIcon } from '@/components/design-system/icons';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function VerifyEmail() {
  const router = useRouter();
  const email = (router.query.email as string) || '';
  const role = (router.query.role as string) || '';
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<number | null>(null);

  const nextAfterVerify = useMemo(() => {
    const qp = new URLSearchParams();
    if (role) qp.set('role', role);
    return `/onboarding/goal${qp.toString() ? `?${qp.toString()}` : ''}`;
  }, [role]);

  useEffect(() => {
    // start a short cooldown when the page opens (prevents double taps)
    setCooldown(15);
  }, []);

  useEffect(() => {
    if (!cooldown) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cooldown]);

  async function resend() {
    try {
      setErr(null);
      setMsg(null);
      setBusy(true);

      await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextAfterVerify
          )}`,
        },
      });

      setMsg('We sent a fresh verification link. Please check your inbox (and spam).');
      setCooldown(30);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to resend. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  const inboxLinks = [
    { href: 'https://mail.google.com/', label: 'Gmail' },
    { href: 'https://outlook.live.com/mail/', label: 'Outlook' },
    { href: 'https://mail.yahoo.com/', label: 'Yahoo' },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Left: Message */}
        <section className="rounded-ds-2xl border border-border/60 bg-surface/70 p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-ds-xl bg-primary/10">
              <MailIcon className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <div>
              <SectionLabel>Verify your email</SectionLabel>
              <p className="text-mutedText text-small">
                We’ve sent a verification link to{' '}
                <strong className="text-foreground">{email || 'your email'}</strong>.
                Click the link to continue.
              </p>
            </div>
          </div>

          {msg && (
            <Alert variant="info" title="Email sent" className="mt-4">
              {msg}
            </Alert>
          )}
          {err && (
            <Alert variant="warning" title="Error" className="mt-4">
              {err}
            </Alert>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={resend} loading={busy} loadingText="Resending…" disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
            </Button>

            <Button asChild variant="secondary">
              <Link
                href={`/signup/email${role ? `?role=${encodeURIComponent(role)}` : ''}`}
                aria-label="Use a different email"
              >
                Use a different email
              </Link>
            </Button>

            <Button asChild variant="ghost">
              <Link href="/login">Back to login</Link>
            </Button>
          </div>

          <p className="mt-3 text-caption text-mutedText">
            After verification you’ll be redirected to{' '}
            <span className="font-medium">{nextAfterVerify}</span>.
          </p>
        </section>

        {/* Right: Helpful actions */}
        <aside className="rounded-ds-2xl border border-border/60 bg-surface/70 p-6 md:p-8">
          <SectionLabel>Quick actions</SectionLabel>
          <p className="text-mutedText text-small">
            Open your inbox in a new tab, then refresh this page after you click the verification link.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {inboxLinks.map((l) => (
              <Button
                key={l.href}
                asChild
                variant="soft"
                tone="primary"
                className="justify-center"
              >
                <a href={l.href} target="_blank" rel="noreferrer noopener" aria-label={`Open ${l.label}`}>
                  {l.label}
                </a>
              </Button>
            ))}
          </div>

          <div className="mt-6 rounded-ds-xl bg-muted/40 p-4">
            <h3 className="mb-1 font-medium">Didn’t get the email?</h3>
            <ul className="list-disc pl-5 text-small text-mutedText space-y-1">
              <li>Check your spam or promotions folder.</li>
              <li>Add <span className="font-mono">no-reply@supabase.io</span> to contacts.</li>
              <li>Wait a minute—some providers delay new sender emails.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
