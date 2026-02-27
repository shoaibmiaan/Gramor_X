// components/Layout.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FooterMini from '@/components/navigation/FooterMini';
import QuickAccessWidget from '@/components/navigation/QuickAccessWidget';
import HeaderMini from '@/components/navigation/HeaderMini';

const BottomNav = dynamic(
  () => import('@/components/navigation/BottomNav').then((m) => m.default || m),
  { ssr: false }
);

type LayoutProps = {
  children: React.ReactNode;
};

// Mini Footer patterns
const MINI_ROUTE_PATTERNS: RegExp[] = [
  /^\/(login|signup|verify|reset|onboarding)/,
  /^\/(dashboard|account|speaking|listening|reading|writing|ai|partners|admin|mock)(\/|$)/,
];

// Hide bottom nav
const HIDE_BOTTOM_NAV_PATTERNS: RegExp[] = [
  /^\/(login|signup|verify|reset|admin)(\/|$)/,
];

// ✅ HEADER MINI ONLY FOR /mock + ALL CHILD ROUTES
const HEADER_MINI_FOR_MOCK_ONLY: RegExp[] = [
  /^\/mock(?:\/.*)?$/,
];

const matches = (patterns: RegExp[], path: string) =>
  patterns.some((re) => re.test(path));

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useRouter();

  const useMiniFooter = matches(MINI_ROUTE_PATTERNS, pathname);
  const showBottomNav = !matches(HIDE_BOTTOM_NAV_PATTERNS, pathname);
  const isMockRoute = matches(HEADER_MINI_FOR_MOCK_ONLY, pathname);

  // Debug ke liye chaho to ye 2 line temporarily dal ke dekh sakte ho:
  // console.log('[LAYOUT] pathname', pathname, 'isMockRoute', isMockRoute);

  return (
    <>
      <a id="top" aria-hidden="true" />

      {isMockRoute ? <HeaderMini /> : <Header />}

      <main
        id="main-content"
        className="min-h-[60vh] pt-safe pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-16 lg:pb-20"
      >
        {children}
      </main>

      {useMiniFooter ? <FooterMini /> : <Footer />}

      {showBottomNav && <BottomNav />}

      <QuickAccessWidget />
    </>
  );
}
