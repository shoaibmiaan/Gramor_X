// pages/index.tsx
import React, { useEffect } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';

import type { HomeProps } from '@/types/home';
import { createGuestHomeProps } from '@/lib/home';
import { useLocale } from '@/lib/locale';

import HomeViewSwitcher from '@/components/home/HomeViewSwitcher';

export default function HomePage(home: HomeProps) {
  const { t } = useLocale();

  useEffect(() => {
    const clickHandler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.length < 2) return;

      const id = href.slice(1);
      const element = document.getElementById(id);
      if (!element) return;

      event.preventDefault();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', href);
    };

    document.addEventListener('click', clickHandler, { passive: true } as any);
    return () => document.removeEventListener('click', clickHandler);
  }, []);

  return (
    <>
      <Head>
        <title>{t('home.title') || 'Gramor – IELTS Prep'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:text-foreground focus:shadow"
      >
        Skip to main content
      </a>

      <main id="main" className="min-h-[100dvh]">
        <HomeViewSwitcher home={home} />
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  return {
    props: createGuestHomeProps({
      generatedAtISO: new Date().toISOString(),
    }),
  };
};
