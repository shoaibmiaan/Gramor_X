// components/analytics/Analytics.tsx
'use client';

import { useRouter } from 'next/router';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function Analytics() {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === 'function') {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || 'GA_MEASUREMENT_ID', {
          page_path: url,
        });
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  // Basic page view tracking for initial load
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || 'GA_MEASUREMENT_ID', {
        page_path: window.location.pathname,
      });
    }
  }, []);

  return null;
}