import React from 'react';

import { Badge } from '@/components/design-system/Badge';

export function QuizTimer({ seconds }: { seconds: number }) {
  const urgent = seconds <= 10;
  return (
    <Badge variant={urgent ? 'danger' : 'neutral'} size="sm" aria-live="polite">
      ⏱ {seconds}s
    </Badge>
  );
}

export default QuizTimer;
