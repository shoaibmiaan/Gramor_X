import React from 'react';
import { Button } from '@/components/design-system/Button';

type QuickDrillButtonProps = {
  startDrill: () => Promise<void>;
  loading: boolean;
};

export const QuickDrillButton: React.FC<QuickDrillButtonProps> = ({ startDrill, loading }) => {
  return (
    <Button
      onClick={startDrill}
      variant="secondary"
      className="rounded-ds-xl"
      loading={loading} // Now this works because loading is supported in Button
    >
      10-Minute Mode
    </Button>
  );
};

export default QuickDrillButton;
