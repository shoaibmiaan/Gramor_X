// components/layouts/ExamLayout.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import FocusGuard from '@/components/exam/FocusGuard';
import { DistractionFreeBanner } from '@/premium-ui/exam/DistractionFree';
import { PrTimer } from '@/premium-ui/components/PrTimer';

export type ExamLayoutProps = {
  /** Type of exam, used for focus tracking */
  exam: string;
  /** Optional slug identifying the test */
  slug?: string;
  /** Attempt identifier shown in header */
  attemptId?: string;
  /** Title displayed in header */
  title?: string;
  /** Total seconds for timer */
  seconds: number;
  /** Called when timer reaches zero */
  onElapsed?: () => void;
  /** Optional part navigator element shown in header */
  partNavigator?: React.ReactNode;
  /** Question palette sidebar */
  questionPalette?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
};

export default function ExamLayout({
  exam,
  slug,
  attemptId,
  title = 'Exam Room',
  seconds,
  onElapsed,
  partNavigator,
  questionPalette,
  children,
}: ExamLayoutProps) {
  const mainId = React.useId();

  return (
    <>
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:rounded-ds-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <DistractionFreeBanner />
      <FocusGuard exam={exam} slug={slug} />
      <div className="flex min-h-[100dvh] flex-col text-foreground">
        <header
          className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-border/70 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/50"
          role="banner"
        >
          <Container className="flex flex-col gap-4 py-3 pt-safe sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="leading-tight">
                {attemptId && (
                  <div className="text-small text-muted-foreground dark:text-gray-400">Attempt {attemptId}</div>
                )}
                <h1 className="font-semibold">{title}</h1>
              </div>
              {partNavigator}
            </div>
            <div className="shrink-0">
              <PrTimer seconds={seconds} onElapsed={onElapsed} />
            </div>
          </Container>
        </header>

        <main id={mainId} className="flex-1" tabIndex={-1}>
          <Container className="flex flex-col gap-6 py-6 sm:py-8 md:flex-row md:gap-4">
            {questionPalette && (
              <aside className="hidden w-60 shrink-0 md:block" aria-label="Question navigation">
                <Card
                  padding="sm"
                  className="sticky top-[calc(6.5rem+env(safe-area-inset-top,0px))] supports-[backdrop-filter]:bg-card/60"
                >
                  {questionPalette}
                </Card>
              </aside>
            )}
            <section className="flex-1 min-w-0">{children}</section>
          </Container>
        </main>
      </div>
    </>
  );
}