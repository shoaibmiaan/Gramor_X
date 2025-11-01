// components/layouts/ProctoringLayout.tsx
import * as React from 'react';
import { Container } from '@/components/design-system/Container';

const ProctoringLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Proctoring banner */}
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
      <Container className="py-4 sm:py-6">
        <div className="card-surface rounded-ds-2xl p-3 sm:p-4">{children}</div>
      </Container>
    </div>
  );
};

export default ProctoringLayout;
export { ProctoringLayout };
