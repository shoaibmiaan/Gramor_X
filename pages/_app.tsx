import type { AppProps } from 'next/app';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { ThemeProvider } from 'next-themes';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

import { Input } from '@/components/design-system/Input';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import UpgradeModal from '@/components/premium/UpgradeModal';
import { RouteLoadingOverlay } from '@/components/common/RouteLoadingOverlay';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import PublicMarketingLayout from '@/components/layouts/PublicMarketingLayout';
import { HighContrastProvider } from '@/context/HighContrastContext';
import GlobalPlanGuard from '@/components/GlobalPlanGuard';
import { loadTranslations } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n/config';
import type { SubscriptionTier } from '@/lib/navigation/types';

const poppins = Poppins({
  subsets: ['latin'],
});

function InnerApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const { locale: activeLocale } = useLocale();
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const routeLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeLoadingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearRouteLoadingTimeout = () => {
      if (routeLoadingTimeoutRef.current) {
        clearTimeout(routeLoadingTimeoutRef.current);
        routeLoadingTimeoutRef.current = null;
      }
    };

    const clearRouteLoadingFallback = () => {
      if (routeLoadingFallbackRef.current) {
        clearTimeout(routeLoadingFallbackRef.current);
        routeLoadingFallbackRef.current = null;
      }
    };

    const startLoading = (url: string) => {
      if (url === router.asPath) return;
      clearRouteLoadingTimeout();
      clearRouteLoadingFallback();
      routeLoadingTimeoutRef.current = setTimeout(() => {
        setIsRouteLoading(true);
        routeLoadingFallbackRef.current = setTimeout(() => {
          setIsRouteLoading(false);
        }, 8000);
      }, 160);
    };

    const stopLoading = () => {
      clearRouteLoadingTimeout();
      clearRouteLoadingFallback();
      setIsRouteLoading(false);
    };

    router.events.on('routeChangeStart', startLoading);
    router.events.on('beforeHistoryChange', stopLoading);
    router.events.on('routeChangeComplete', stopLoading);
    router.events.on('routeChangeError', stopLoading);
    router.events.on('hashChangeStart', startLoading);
    router.events.on('hashChangeComplete', stopLoading);
    router.events.on('hashChangeError', stopLoading);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopLoading();
      }
    };

    const handlePageHide = () => {
      stopLoading();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      router.events.off('routeChangeStart', startLoading);
      router.events.off('beforeHistoryChange', stopLoading);
      router.events.off('routeChangeComplete', stopLoading);
      router.events.off('routeChangeError', stopLoading);
      router.events.off('hashChangeStart', startLoading);
      router.events.off('hashChangeComplete', stopLoading);
      router.events.off('hashChangeError', stopLoading);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      clearRouteLoadingTimeout();
      clearRouteLoadingFallback();
    };
  }, [router]);

  useEffect(() => {
    if (routeLoadingFallbackRef.current) {
      clearTimeout(routeLoadingFallbackRef.current);
      routeLoadingFallbackRef.current = null;
    }
    setIsRouteLoading(false);
  }, [router.asPath]);

  useEffect(() => {
    void loadTranslations(activeLocale as SupportedLocale);
  }, [activeLocale]);

  type User = {
    id?: string | null;
    role?: string | null;
    isTeacherApproved?: boolean | null;
  };
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    const metadata = (user?.user_metadata ?? {}) as { tier?: SubscriptionTier | null };
    const appMeta = (user?.app_metadata ?? {}) as { tier?: SubscriptionTier | null };
    const nextTier = metadata.tier ?? appMeta.tier ?? 'free';
    setSubscriptionTier(nextTier);
  }, [user]);

  useEffect(() => {
    const handleTierUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ tier?: SubscriptionTier }>).detail;
      if (detail?.tier) setSubscriptionTier(detail.tier);
    };

    window.addEventListener('subscription:tier-updated', handleTierUpdated as EventListener);
    return () => window.removeEventListener('subscription:tier-updated', handleTierUpdated as EventListener);
  }, []);

  const needPremium = useMemo(
    () => pathname.startsWith('/premium'),
    [pathname]
  );

  return (
    <ThemeProvider attribute="class">
      <HighContrastProvider>
        <div className={poppins.className}>
          <Component {...pageProps} />
          <AuthAssistant />
          <SidebarAI />
          <UpgradeModal />
          <RouteLoadingOverlay active={isRouteLoading} tier={subscriptionTier} />
        </div>
      </HighContrastProvider>
    </ThemeProvider>
  );
}

export default function App(props: AppProps) {
  return <InnerApp {...props} />;
}