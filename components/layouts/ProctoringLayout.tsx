// components/layouts/ProctoringLayout.tsx
import * as React from 'react';
import { Camera, MicVocal, MonitorCheck } from 'lucide-react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { LayoutHero } from '@/components/layouts/shared/LayoutHero';
import { LayoutSurface } from '@/components/layouts/shared/LayoutSurface';

const statusItems = [
  { label: 'Camera', value: 'Active', icon: <Camera className="h-4 w-4" /> },
  { label: 'Microphone', value: 'Active', icon: <MicVocal className="h-4 w-4" /> },
  { label: 'Tab Focus', value: 'Locked', icon: <MonitorCheck className="h-4 w-4" /> },
];

const ProctoringLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const highlight = (
    <>
      <div className="flex items-center gap-2 text-foreground">
        <Badge variant="danger">Proctoring enabled</Badge>
        <span className="text-sm font-medium">Monitoring camera, mic, and browser activity</span>
      </div>
      <div className="grid gap-3 pt-3 text-foreground">
        {statusItems.map(({ label, value, icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 shadow-sm"
          >
            <div className="flex items-center gap-2 text-sm text-mutedText">
              {icon}
              <span>{label}</span>
            </div>
            <span className="text-sm font-semibold text-danger">{value}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-danger/10 via-background to-background text-foreground">
      <LayoutHero
        accent="proctoring"
        eyebrow="Secure exam session"
        title="Your environment is being proctored"
        description="Keep your camera on, remain in full-screen mode, and avoid switching tabs to maintain exam integrity."
        actions={(
          <Button href="/support" variant="soft" tone="danger" size="lg">
            Need help?
          </Button>
        )}
        highlight={highlight}
      />

      <LayoutSurface accent="proctoring" paddingClassName="p-4 sm:p-6">
        <div className="space-y-4 text-base leading-relaxed text-foreground">{children}</div>
      </LayoutSurface>
    </div>
  );
};

export default ProctoringLayout;
export { ProctoringLayout };
