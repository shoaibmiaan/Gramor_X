import React from 'react';
import { Alert } from '@/components/design-system/Alert';
import { StreakCounter } from '@/components/streak/StreakCounter';

interface StreakPanelProps {
  streak: number;
  longest: number;
  loading: boolean;
  shields: number;
  nextRestart: string | null;
}

export const StreakPanel: React.FC<StreakPanelProps> = ({
  streak,
  longest,
  loading,
  shields,
  nextRestart,
}) => {
  return (
    <div id="streak-panel">
      <StreakCounter
        current={streak}
        longest={longest}
        loading={loading}
        shields={shields}
      />
      {nextRestart && (
        <Alert variant="info" className="mt-4">
          Streak will restart on {nextRestart}.
        </Alert>
      )}
    </div>
  );
};