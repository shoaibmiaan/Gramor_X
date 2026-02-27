'use client';

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
  showRightOnMobile?: boolean;
  mobilePrimaryLabel?: string;
  mobileSecondaryLabel?: string;
};

const DefaultRight = () => (
  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-purpleVibe/20 via-electricBlue/10 to-neonGreen/10">
    <Image
      src="/brand/logo.png"
      alt="GramorX Logo"
      width={120}
      height={120}
      priority
      className="h-24 w-24 object-contain md:h-32 md:w-32"
    />
    <h2 className="mt-6 text-h3 font-semibold text-grayish dark:text-gray-300">
      Your IELTS Companion
    </h2>
  </div>
);

export default function AuthLayout({
  title,
  subtitle,
  children,
  right,
  showRightOnMobile = false,
  mobilePrimaryLabel = 'Account',
  mobileSecondaryLabel = 'Highlights',
}: Props) {
  const [mobileView, setMobileView] =
    React.useState<'left' | 'right'>('left');

  const rightContent = right ?? <DefaultRight />;

  const hideLeft = showRightOnMobile && mobileView !== 'left';
  const hideRight = showRightOnMobile && mobileView !== 'right';

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-40">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-4 py-6">
        {/* ---------------- MOBILE TOGGLE ---------------- */}
        {showRightOnMobile && (
          <div className="mb-6 flex justify-center md:hidden">
            <div className="flex w-full max-w-sm rounded-full bg-muted/70 p-1 backdrop-blur">
              <button
                onClick={() => setMobileView('left')}
                className={clsx(
                  'flex-1 rounded-full px-4 py-2 text-sm transition',
                  mobileView === 'left'
                    ? 'bg-background shadow-sm'
                    : 'text-mutedText'
                )}
              >
                {mobilePrimaryLabel}
              </button>

              <button
                onClick={() => setMobileView('right')}
                className={clsx(
                  'flex-1 rounded-full px-4 py-2 text-sm transition',
                  mobileView === 'right'
                    ? 'bg-background shadow-sm'
                    : 'text-mutedText'
                )}
              >
                {mobileSecondaryLabel}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- SPLIT LAYOUT ---------------- */}
        <div
          className="
            flex-1
            overflow-hidden
            rounded-2xl
            border border-border
            bg-card/10
            shadow-xl
            md:grid
            md:grid-cols-[1.1fr_0.9fr]
          "
        >
          {/* LEFT PANEL */}
          <section
            className={clsx(
              'flex flex-col justify-center bg-background',
              'px-[clamp(1.5rem,4vw,3rem)] py-[clamp(2rem,6vh,4rem)]',
              hideLeft && 'hidden md:flex'
            )}
          >
            <div className="mx-auto w-full max-w-md space-y-6">
              {/* Brand */}
              <Link
                href="/"
                className="flex items-center gap-3 hover:opacity-80"
              >
                <Image
                  src="/brand/logo.png"
                  alt="GramorX"
                  width={40}
                  height={40}
                  priority
                />
                <span className="font-slab text-h2 font-bold text-gradient-primary">
                  GramorX
                </span>
              </Link>

              {/* Heading */}
              <div className="space-y-2">
                <h1 className="font-slab text-h1 font-bold">
                  {title}
                </h1>

                {subtitle && (
                  <p className="text-small text-grayish">
                    {subtitle}
                  </p>
                )}
              </div>

              {children}
            </div>
          </section>

          {/* RIGHT PANEL */}
          <aside
            className={clsx(
              'flex items-center justify-center bg-muted',
              'border-t md:border-t-0 md:border-l border-border',
              'p-[clamp(1.5rem,4vw,3rem)]',
              hideRight && 'hidden md:flex'
            )}
          >
            <div className="h-full w-full">{rightContent}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}