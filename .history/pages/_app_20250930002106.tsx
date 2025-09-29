// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import '@/styles/tokens.css';
import '@/styles/premium.css';
import '@/styles/semantic.css';
import '@/styles/globals.css';
import '@/styles/themes/index.css';

import Layout from '@/components/Layout';
import { ToastProvider } from '@/components/design-system/Toaster';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { LanguageProvider } from '@/lib/locale';
import { PremiumThemeProvider } from '@/premium-ui/theme/PremiumThemeProvider';
import SidebarAI from '@/components/ai/SidebarAI';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { env } from '@/lib/env';
import useRouteGuard from '@/hooks/useRouteGuard';
import { initIdleTimeout } from '@/utils/idleTimeout';
import { UserProvider } from '@/context/UserContext';

/**
 * Single place to react to Supabase auth changes.
 * This fixes the issue where after signing in the page does not navigate
 * until a manual refresh, by pushing the user to the intended route.
 */
function AuthBridge() {
  const router = useRouter();

  useEffect(() => {
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // Notify the app so other parts can refetch if needed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:changed', { detail: { event } }));
        }

        // On sign-in: go to ?next=... if present; otherwise to home
        if (event === 'SIGNED_IN' && session?.user) {
          const url = new URL(window.location.href);
          const next = url.searchParams.get('next');
          const target = next && next.startsWith('/') ? next : '/';
          router.replace(target);
        }

        // On sign-out: kick to /login if we're on a protected page
        if (event === 'SIGNED_OUT') {
          if (!['/login', '/signup', '/forgot', '/reset', '/verify'].includes(router.pathname)) {
            router.replace('/login');
          }
        }
      },
    );

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

/**
 * Top-level wrapper that applies theme, layout, route-guard, and global providers.
 */
function InnerApp({ Component, pageProps }: AppProps) {
  const { isChecking } = useRouteGuard();
  const idleMinutes = useMemo(
    () => Number(env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES ?? 30),
    [],
  );

  useEffect(() => {
    const stop = initIdleTimeout(idleMinutes);
    return stop;
  }, [idleMinutes]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PremiumThemeProvider>
        <ImpersonationBanner />
        <AuthBridge />
        <Layout>
          {isChecking ? (
            <div className="min-h-[60vh] grid place-items-center">
              <div role="status" aria-live="polite" className="text-sm opacity-70">
                Loading…
              </div>
            </div>
          ) : (
            <Component {...pageProps} />
          )}
        </Layout>
        <SidebarAI />
      </PremiumThemeProvider>
    </ThemeProvider>
  );
}

export default function App(props: AppProps) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <NotificationProvider>
          <UserProvider>
            <InnerApp {...props} />
          </UserProvider>
        </NotificationProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
