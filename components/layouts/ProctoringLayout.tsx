// components/layouts/ProctoringLayout.tsx
import * as React from 'react';
import { ShieldAlert } from 'lucide-react';

import { Container } from '@/components/design-system/Container';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';

const ProctoringLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-40 bg-background/90 pb-2 pt-safe backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <LayoutHero
          accent="proctoring"
          icon={ShieldAlert}
          eyebrow="Exam mode"
          title="Proctoring in progress"
          subtitle="Camera, microphone, and tab focus are actively monitored. Stay within the test window to avoid flags."
          className="pb-2 sm:pb-4"
        >
          <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-amber-900 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-amber-100/90">
            Camera ✓ — positioned correctly
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-amber-900 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-amber-100/90">
            Microphone ✓ — audio levels healthy
          </div>
          <div className="rounded-2xl border border-white/50 bg-white/70 p-4 text-sm font-medium text-amber-900 shadow-sm dark:border-white/10 dark:bg-slate-900/60 dark:text-amber-100/90">
            Focus ✓ — no tab changes detected
          </div>
        </LayoutHero>
      </div>

      <Container className="pb-10">
        <div className="card-surface rounded-ds-2xl p-3 shadow-[0_25px_55px_rgba(245,158,11,0.18)] sm:p-4 dark:shadow-none">{children}</div>
      </Container>
    </div>
  );
};

export default ProctoringLayout;
export { ProctoringLayout };
