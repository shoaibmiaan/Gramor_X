import * as React from 'react';
import type { ActivityStats } from '@/types/activity';
import ActionSupportPanel from '@/components/shared/ActionSupportPanel';
import {
  Plus,
  FileText,
  Mic,
  Headphones,
  BookOpen,
  Download,
  Share2,
  Bell,
  TrendingUp,
  ListChecks,
} from 'lucide-react';

interface QuickActionsProps {
  stats: ActivityStats;
  onTaskCreate: () => void;
  onViewAllTasks: () => void;
}

export default function QuickActions({ stats, onTaskCreate, onViewAllTasks }: QuickActionsProps) {
  return (
    <ActionSupportPanel
      title="Quick actions"
      subtitle="Jump into your next IELTS practice block in one tap."
      actionsColumns={2}
      actions={[
        {
          id: 'create-task',
          icon: <Plus className="h-4 w-4" />,
          label: 'Create New Task',
          description: 'Add a new goal to your tracker',
          onClick: onTaskCreate,
        },
        {
          id: 'view-all',
          icon: <ListChecks className="h-4 w-4" />,
          label: `View All Tasks (${stats.pendingTasks + stats.completedTasks})`,
          description: 'Review pending and completed work',
          onClick: onViewAllTasks,
        },
        {
          id: 'writing',
          icon: <FileText className="h-4 w-4" />,
          label: 'Start Writing',
          description: 'Practice task 2 essay',
          href: '/writing/practice',
        },
        {
          id: 'speaking',
          icon: <Mic className="h-4 w-4" />,
          label: 'Speaking Practice',
          description: 'Part 2 cue card',
          href: '/speaking/practice',
        },
        {
          id: 'listening',
          icon: <Headphones className="h-4 w-4" />,
          label: 'Listening Exercise',
          description: 'Section 3 practice',
          href: '/listening/practice',
        },
        {
          id: 'reading',
          icon: <BookOpen className="h-4 w-4" />,
          label: 'Reading Passage',
          description: 'Academic passage 1',
          href: '/reading/practice',
        },
        {
          id: 'export',
          icon: <Download className="h-4 w-4" />,
          label: 'Export Data',
          description: 'Download your activity data',
          href: '/account/activity',
        },
        {
          id: 'share',
          icon: <Share2 className="h-4 w-4" />,
          label: 'Share Progress',
          description: 'Share your latest milestones',
          href: '/progress',
        },
        {
          id: 'reminder',
          icon: <Bell className="h-4 w-4" />,
          label: 'Set Reminder',
          description: 'Stay consistent every day',
          href: '/account/notifications',
        },
        {
          id: 'analytics',
          icon: <TrendingUp className="h-4 w-4" />,
          label: 'View Analytics',
          description: 'Track growth over time',
          href: '/progress',
        },
      ]}
      supportTitle="Need help?"
      supportDescription="Get support from the team if something blocks your progress."
      supportPrimaryCta={{ label: 'Contact support', href: '/help', variant: 'secondary' }}
      supportSecondaryCta={{ label: 'Open AI assistant', href: '/ai', variant: 'ghost' }}
    />
  );
}
