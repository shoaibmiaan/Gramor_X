'use client';
// components/layouts/AuthLayout.tsx

import React from 'react';
import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/design-system/ThemeToggle';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  rightIllustration?: React.ReactNode;
  showRightOnMobile?: boolean;
  mobilePrimaryLabel?: string;
  mobileSecondaryLabel?: string;
};

const DefaultRight = () => (
  <div className="relative h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-purpleVibe/20 via-electricBlue/10 to-neonGreen/10">
    <Image
      src="/brand/logo.png"
      alt="GramorX Logo"
      width={120}
      height={120}
      className="h-24 w-24 md:h-32 md:w-32 object-contain drop-shadow-lg"
      priority
    />
    <h2 className="mt-6 text-h3 font-semibold text-grayish dark:text-gray-300">Your IELTS Companion</h2>
  </div>
);

export default function AuthLayout({
  title,
  subtitle,
  children,
  right,
  rightIllustration,
  showRightOnMobile = false,
  mobilePrimaryLabel,
  mobileSecondaryLabel,
}: Props) {
  const rightContent = right ?? rightIllustration ?? <DefaultRight />;

  // Mobile-only segmented toggle
  const [mobileView, setMobileView] = React.useState<'left' | 'right'>('left');
  const tabsId = React.useId();
  const primaryLabel = mobilePrimaryLabel ?? 'Account';
  const secondaryLabel = mobileSecondaryLabel ?? 'Highlights';
  const leftTabId = `${tabsId}-left-tab`;
  const rightTabId = `${tabsId}-right-tab`;
  const leftPanelId = `${tabsId}-left-panel`;
  const rightPanelId = `${tabsId}-right-panel`;

  const leftPanelHidden = showRightOnMobile && mobileView !== 'left';
  const rightPanelHidden = showRightOnMobile ? mobileView !== 'right' : true;

  const leftPanelClassName = clsx(
    'bg-background px-6 py-10 sm:px-10 md:px-12',
    'flex flex-col justify-center',
    'transition-opacity duration-200',
    leftPanelHidden && 'hidden md:flex'
  );

  const rightPanelClassName = clsx(
    'bg-muted',
    'flex-col items-center justify-center',
    'border-t border-border p-8 sm:p-10 md:border-t-0',
    rightPanelHidden ? 'hidden md:flex' : 'flex md:flex'
  );

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      {/* Theme toggle */}
      <div className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-40">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] pt-[calc(env(safe-area-inset-top,0px)+5rem)] sm:px-6 md:px-0 md:pt-[calc(env(safe-area-inset-top,0px)+6rem)]">
        {showRightOnMobile && (
          <div className="mb-6 flex justify-center md:hidden">
            <div
              role="tablist"
              aria-label="Authentication layout views"
              className="inline-flex w-full max-w-sm items-center justify-center gap-1 rounded-full bg-muted/70 p-1 text-sm font-medium shadow-sm backdrop-blur"
            >
              <button
                type="button"
                role="tab"
                id={leftTabId}
                aria-controls={leftPanelId}
                aria-selected={mobileView === 'left'}
                tabIndex={mobileView === 'left' ? 0 : -1}
                onClick={() => setMobileView('left')}
                className={`flex-1 rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  mobileView === 'left'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-mutedText hover:text-foreground'
                }`}
              >
                {primaryLabel}
              </button>
              <button
                type="button"
                role="tab"
                id={rightTabId}
                aria-controls={rightPanelId}
                aria-selected={mobileView === 'right'}
                tabIndex={mobileView === 'right' ? 0 : -1}
                onClick={() => setMobileView('right')}
                className={`flex-1 rounded-full px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  mobileView === 'right'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-mutedText hover:text-foreground'
                }`}
              >
                {secondaryLabel}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card/10 shadow-xl md:min-h-[70vh] md:grid md:grid-cols-2">
          {/* LEFT (form) */}
          <section
            role="tabpanel"
            id={leftPanelId}
            aria-labelledby={leftTabId}
            aria-hidden={leftPanelHidden}
            className={leftPanelClassName}
          >
            <div className="w-full max-w-md space-y-6">
              {/* Brand header */}
              <Link href="/" className="mb-6 flex items-center gap-3 transition-opacity hover:opacity-80">
                <Image src="/brand/logo.png" alt="GramorX" width={40} height={40} priority />
                <span className="font-slab text-h2 font-bold text-gradient-primary">GramorX</span>
              </Link>

              <div className="space-y-2">
                <h1 className="font-slab text-h1 sm:text-display font-bold text-gray-800 dark:text-white">{title}</h1>
                {subtitle && (
                  <p className="text-small text-grayish dark:text-gray-400">{subtitle}</p>
                )}
              </div>

              <div>{children}</div>
            </div>
          </section>

          {/* RIGHT (info/illustration) */}
          <aside
            role="tabpanel"
            id={rightPanelId}
            aria-labelledby={rightTabId}
            aria-hidden={rightPanelHidden}
            className={rightPanelClassName}
          >
            <div className="h-full w-full">{rightContent}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
