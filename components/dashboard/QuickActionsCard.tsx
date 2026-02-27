import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/design-system/Card';
import { ActionButtons } from './ActionButtons';

interface QuickActionsCardProps {
  onShareDashboard: () => void;
  speakingVocabSlug: string;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onShareDashboard,
  speakingVocabSlug,
}) => {
  return (
    <Card className="rounded-ds-2xl p-6">
      <h2 className="font-slab text-h2">Quick actions</h2>
      <p className="mt-1 text-grayish">Jump back in with one click.</p>
      <ActionButtons
        onShareDashboard={onShareDashboard}
        speakingVocabSlug={speakingVocabSlug}
      />
    </Card>
  );
};