// pages/signup/check-email.tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/design-system/Button';
import { SectionLabel } from '@/components/design-system/SectionLabel';
import { Alert } from '@/components/design-system/Alert';

export default function CheckEmail() {
  const email = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const u = new URL(window.location.href);
    return u.searchParams.get('email') ?? '';
  }, []);

  return (
    <main className="min-h-screen bg-app-surface px-4 py-12">
      <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
        {/* Left: Copy + actions */}
        <section className="rounded-2xl bg-surface shadow-elevated p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <Image
              src="/logo-mark.png"
              alt="GramorX"
              width={40}
              height={40}
              className="rounded-xl"
              priority
            />
            <h1 className="text-3xl font-semibold tracking-tight text-brand">
              GramorX
            </h1>
          </div>

          <SectionLabel>Verify your email</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold">Check your inbox</h2>
          <p className="mt-2 text-muted-foreground">
            We sent a verification link to{` `}
            <span className="font-medium">{email || 'your email'}</span>. Click
            the link to continue.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/api/auth/resend?email=${encodeURIComponent(email)}`}>
                Resend link
              </Link>
            </Button>

            <Link
              href="/signup/email"
              className="text-link hover:underline focus:outline-none focus:ring-2 focus:ring-focus"
            >
              Use a different email
            </Link>
          </div>

          <div className="mt-6">
            <Alert tone="info" title="Didn’t get it?">
              Check Spam/Promotions. If you still don’t see it, hit “Resend
              link.” Links expire after a short time.
            </Alert>
          </div>

          <div className="mt-8">
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground hover:underline"
            >
              ← Back to login
            </Link>
          </div>
        </section>

        {/* Right: Brand panel */}
        <aside className="rounded-2xl bg-gradient-brand p-10 flex items-center justify-center text-center shadow-elevated">
          <div>
            <Image
              src="/brand/companion-icon.png"
              alt=""
              width={80}
              height={80}
              className="mx-auto mb-6"
            />
            <h3 className="text-2xl font-semibold">Your IELTS Companion</h3>
            <p className="mt-2 text-muted-foreground">
              Smart practice. Instant feedback. Clear progress.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
