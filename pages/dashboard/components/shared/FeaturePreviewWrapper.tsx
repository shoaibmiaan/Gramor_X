import type { ReactNode } from 'react';

import { Button } from '@/components/design-system/Button';

type FeaturePreviewWrapperProps = {
  locked: boolean;
  onUpgrade: () => void;
  onTrySample?: () => void;
  children: ReactNode;
};

const FeaturePreviewWrapper = ({ locked, onUpgrade, onTrySample, children }: FeaturePreviewWrapperProps) => {
  if (!locked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60">
      <div className="pointer-events-none blur-[2px] opacity-70">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 p-4 text-center">
        <p className="text-sm font-medium">Premium feature preview</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onTrySample}>Try 1 sample</Button>
          <Button size="sm" onClick={onUpgrade}>Upgrade</Button>
        </div>
      </div>
    </div>
  );
};

export default FeaturePreviewWrapper;
