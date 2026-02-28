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

import { Container } from '@/components/design-system/Container';

const BottomNav = dynamic(
  () => import('@/components/navigation/BottomNav'),
  { ssr: false }
);

type LayoutProps = {
  children: React.ReactNode;
};

// Route patterns (unchanged from your version)
const MINI_ROUTE_PATTERNS: RegExp[] = [
  /^\/(login|signup|verify|reset|onboarding)/,
  /^\/(dashboard|account|speaking|listening|reading|writing|ai|partners|admin|mock)(\/|$)/,
];

const HIDE_BOTTOM_NAV_PATTERNS: RegExp[] = [
  /^\/(login|signup|verify|reset|admin)(\/|$)/,
];

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

  return (
    <>
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-background px-4 py-2 rounded-2xl border border-border shadow-sm focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      <a id="top" aria-hidden="true" />

      {isMockRoute ? <HeaderMini /> : <Header />}

      <main
        id="main-content"
        className="min-h-screen bg-background dark:bg-darker"
      >
        <Container className="py-8 md:py-12 lg:py-16">
          {children}
        </Container>
      </main>

      {useMiniFooter ? <FooterMini /> : <Footer />}

      {showBottomNav && <BottomNav />}

      <QuickAccessWidget />
    </>
  );
}
