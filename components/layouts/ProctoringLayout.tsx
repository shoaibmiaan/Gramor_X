// components/layouts/ProctoringLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';

const ProctoringLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const mainId = React.useId();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:rounded-ds-lg focus:bg-background focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Proctoring banner */}
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70" role="banner">
        <Container className="py-2 pt-safe">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-small">
              <span className="font-medium">Proctoring Enabled</span>{' '}
              <span className="text-mutedText">— camera, microphone, and tab focus are being monitored.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-caption">
              <span className="badge bg-primary/10 text-primary rounded-full px-2 py-1">Camera ✓</span>
              <span className="badge bg-primary/10 text-primary rounded-full px-2 py-1">Mic ✓</span>
              <span className="badge bg-primary/10 text-primary rounded-full px-2 py-1">Tab Focus ✓</span>
            </div>
          </div>
        </Container>
      </div>

      {/* Body */}
      <main id={mainId} tabIndex={-1} className="focus:outline-none">
        <Container className="py-4 sm:py-6">
          <div className="card-surface rounded-ds-2xl p-3 sm:p-4">{children}</div>
        </Container>
      </main>
    </div>
  );
};

export default ProctoringLayout;
export { ProctoringLayout };
