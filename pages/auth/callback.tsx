// pages/auth/callback.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';

export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;

    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const token_hash = url.searchParams.get('token_hash');
      const type = (url.searchParams.get('type') || '').toLowerCase(); // signup, magiclink, recovery, etc.
      const next = url.searchParams.get('next') || '/';

      try {
        // 1) Handle "code" (OAuth / newer magic link) first
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data.session) {
            await supabase.auth.setSession(data.session);
          }

          // Best-effort: notify server cookies (if present in your project)
          try {
            await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
            });
          } catch { /* ignore */ }

          if (!cancelled) router.replace(next.startsWith('/') ? next : '/');
          return;
        }

        // 2) Handle "token_hash" (email confirm / recovery / invite / email_change)
        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          });
          if (error) throw error;

          if (data.session) {
            await supabase.auth.setSession(data.session);
          }

          try {
            await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
            });
          } catch { /* ignore */ }

          if (!cancelled) router.replace(next.startsWith('/') ? next : '/');
          return;
        }

        // Nothing to verify — just go home
        if (!cancelled) router.replace('/');
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Verification failed.');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, router.isReady]);

  return (
    <>
      <Head><title>Signing you in…</title></Head>
      <div className="grid min-h-[100dvh] place-items-center">
        {err ? (
          <div className="rounded-ds-2xl border border-destructive/40 p-6 max-w-md">
            <h1 className="text-lg font-semibold text-destructive">Couldn’t verify your email</h1>
            <p className="mt-2 text-muted-foreground">{err}</p>
            <button className="btn mt-4" onClick={() => router.replace('/login')}>Back to login</button>
          </div>
        ) : (
          <div className="text-center">
            <div className="h-6 w-40 animate-pulse rounded bg-border mx-auto" />
            <p className="mt-3 text-muted-foreground">Completing sign-in…</p>
          </div>
        )}
      </div>
    </>
  );
}
