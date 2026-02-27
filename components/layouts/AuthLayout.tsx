'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/design-system/ThemeToggle';

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
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
  title = 'Welcome',
  subtitle,
  children,
  right,
}: Props) {
  const rightContent = right ?? <DefaultRight />;

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-40">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1200px] flex-col px-3 py-3 sm:px-4 sm:py-4">

        {/* ---------------- SPLIT LAYOUT ---------------- */}
        <div
          className="
            flex-1
            overflow-hidden
            rounded-xl
            border border-border
            bg-card/10
            shadow-lg sm:rounded-2xl sm:shadow-xl
            md:grid
            md:grid-cols-[1.1fr_0.9fr]
          "
        >
          {/* LEFT PANEL */}
          <section className="flex flex-col justify-center bg-background px-[clamp(1rem,4vw,3rem)] py-[clamp(1rem,4vh,2rem)] sm:px-[clamp(1.5rem,4vw,3rem)] sm:py-[clamp(1.25rem,4vh,2.5rem)]">
            <div className="mx-auto w-full max-w-md space-y-5 sm:space-y-6">
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
                <h1 className="font-slab text-2xl font-bold leading-tight sm:text-h1">
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
            className="hidden items-center justify-center border-t border-border bg-muted p-[clamp(1.5rem,4vw,3rem)] md:flex md:border-l md:border-t-0"
          >
            <div className="h-full w-full">{rightContent}</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
