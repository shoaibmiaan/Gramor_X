import React from 'react';
import { QuickActions } from './QuickActions';

interface QuickActionsCardProps {
  onShareDashboard: () => void;
  speakingVocabSlug: string;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onShareDashboard,
  speakingVocabSlug,
}) => {
  void onShareDashboard;

  return (
    <QuickActions
      actions={[
        {
          id: 'resume-learning',
          label: 'Resume learning',
          description: 'Continue from your current study plan checkpoint.',
          href: '/learning',
        },
        {
          id: 'start-mock',
          label: 'Start mock',
          description: 'Run a timed exam simulation to refresh your band estimate.',
          href: '/mock',
        },
        {
          id: 'view-progress',
          label: 'View details',
          description: 'Open progress analytics and review your trend line.',
          href: '/progress',
        },
        {
          id: 'start-speaking',
          label: 'Start speaking vocab',
          description: 'Jump into your personalized speaking vocabulary module.',
          href: `/vocabulary/speaking/${speakingVocabSlug}`,
        },
        {
          id: 'join-community',
          label: 'Join challenge',
          description: 'Compete with other learners in weekly goal challenges.',
          href: '/challenge',
        },
        {
          id: 'share-progress',
          label: 'Share dashboard',
          description: 'Generate and share your current progress snapshot.',
          href: '#share',
        },
      ]}
    />
  );
};
