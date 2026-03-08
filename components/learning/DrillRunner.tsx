// components/learning/DrillRunner.tsx (example)
import React from 'react';
import { Button } from '@/components/design-system/Button';

export const DrillRunner: React.FC = () => {
  const onDrillCompleted = async () => {
    // ... existing save/score logic
    // completion is persisted by actionable API submissions only
  };

  return (
    <div className="card-surface p-6 rounded-ds-2xl">
      {/* ...drill UI... */}
      <Button variant="primary" onClick={onDrillCompleted} className="mt-4 rounded-ds-xl">
        Finish & Count for Today
      </Button>
    </div>
  );
};
