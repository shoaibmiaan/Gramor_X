'use client';

import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

type Props = { percentKey: string };

const OnboardingProgress: React.FC<Props> = ({ percentKey }) => {
  const [percent, setPercent] = React.useState(0);

  React.useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(percentKey) : null;
    const val = raw ? Number(raw) : 0;
    setPercent(Number.isFinite(val) ? val : 0);
  }, [percentKey]);

  return (
    <Card className="space-y-2">
      <div className="font-semibold">Onboarding Progress</div>
      <ProgressBar value={percent} />
      <div className="text-xs text-mutedText">{percent}% completed</div>
    </Card>
  );
};

export default OnboardingProgress;
