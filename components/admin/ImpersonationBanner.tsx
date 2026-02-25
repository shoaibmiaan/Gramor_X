// components/admin/ImpersonationBanner.tsx
import React, { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Who = { id?: string; email?: string };

export function ImpersonationBanner() {
  const [show, setShow] = useState(false);
  const [who, setWho] = useState<Who | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      // SSR-safe: only read localStorage in the browser
      if (typeof window === 'undefined') return;

      const isImpersonating = localStorage.getItem('impersonating') === '1';
      if (!isImpersonating) return;

      try {
        const {
          data: { user },
        } = await supabaseBrowser.auth.getUser();

        if (!alive) return;

        const impUserId = localStorage.getItem('impUserId') || undefined;

        // Show banner only if user exists and (optionally) matches stored impersonated id
        if (user && (!impUserId || user.id === impUserId)) {
          setWho({ id: user.id, email: user.email || undefined });
          setShow(true);
        }
      } catch {
        // Fail closed: if we can't verify, don't render the banner
        setShow(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  const stop = async () => {
    try {
      // Best-effort server log (non-blocking)
      void fetch('/api/admin/stop-impersonation').catch(() => {});
    } finally {
      // SSR-safe guards
      if (typeof window !== 'undefined') {
        localStorage.removeItem('impersonating');
        localStorage.removeItem('impUserId');
        localStorage.removeItem('impStartedAt');
      }

      try {
        await supabaseBrowser.auth.signOut();
      } catch {
        // ignore sign-out errors; we'll hard-redirect anyway
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/admin';
      }
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b border-warning/60 bg-warning/10 text-warning-foreground dark:border-warning/30 dark:bg-warning/20 dark:text-warning"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2">
        <div className="text-small">
          <strong>Impersonation mode</strong>
          {who?.email ? (
            <>
              {' '}
              — signed in as <span className="underline">{who.email}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stop}
            className="text-small rounded-lg border border-warning/60 px-3 py-1.5 hover:bg-warning/20 dark:border-warning/30 dark:hover:bg-warning/20"
          >
            Return to Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImpersonationBanner;
