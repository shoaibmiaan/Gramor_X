// pages/auth/callback.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { Alert } from '@/components/design-system/Alert';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      try {
        let session = null;

        // 1) New PKCE/email link flow: ?code=...
        const code = typeof router.query.code === 'string' ? router.query.code : null;
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          session = data.session;
        } else {
          // 2) Legacy hash-token flow: #access_token=...&refresh_token=...
          const hash = typeof window !== 'undefined' ? window.location.hash : '';
          if (hash) {
            const p = new URLSearchParams(hash.replace(/^#/, ''));
            const access_token = p.get('access_token');
            const refresh_token = p.get('refresh_token');
            if (access_token && refresh_token) {
              const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (error) throw error;
              session = data.session;
            }
          }
        }

        // Best-effort: sync cookies for middleware/API
        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ event: 'SIGNED_IN', session }),
          });
        } catch {}

        // Figure out where to go next
        const rawNext = typeof router.query.next === 'string' ? router.query.next : '/';
        const target = rawNext.startsWith('/') ? rawNext : '/';

        if (session?.user) {
          router.replace(target);
        } else {
          // User might be confirmed but no session (e.g. old link or blocked 3rd-party cookies)
          router.replace(`/login?next=${encodeURIComponent(target)}`);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Could not complete sign-in.');
        const rawNext = typeof router.query.next === 'string' ? router.query.next : '/';
        setTimeout(() => router.replace(`/login?next=${encodeURIComponent(rawNext)}`), 1500);
      }
    })();
  }, [router]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-8">
      <div className="max-w-md w-full">
        {!error ? (
          <Alert variant="info" title="Finishing sign-in…">
            Please wait while we complete your sign-in.
          </Alert>
        ) : (
          <Alert variant="warning" title="Verification problem">
            {error}
          </Alert>
        )}
      </div>
    </div>
  );
}
