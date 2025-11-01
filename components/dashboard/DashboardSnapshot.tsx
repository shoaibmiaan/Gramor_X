// components/dashboard/DashboardSnapshot.tsx
import React from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Icon } from '@/components/design-system/Icon';

interface SnapshotTask {
  title: string;
  description: string | null;
  href: string;
}

interface DashboardSnapshotProps {
  nextTask: SnapshotTask | null;
  streak: number;
  longestStreak: number;
  shields: number;
  hasChallenge: boolean;
  onShare: () => void;
}

const DashboardSnapshot: React.FC<DashboardSnapshotProps> = ({
  nextTask,
  streak,
  longestStreak,
  shields,
  hasChallenge,
  onShare,
}) => {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-ds-2xl border border-border/60 bg-card/95 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Next focus</p>
            <p className="text-h4 font-semibold text-foreground">{nextTask ? nextTask.title : 'Choose your mission'}</p>
          </div>
          <Icon name="Target" size={24} className="text-primary" />
        </div>
        <p className="mt-3 text-small text-mutedText">
          {nextTask?.description ?? 'Select a module below to unlock a guided recommendation.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href={nextTask?.href ?? '/study-plan'} size="sm">
            {nextTask ? 'Start now' : 'Open plan'}
          </Button>
          <Button href="/study-plan" variant="ghost" size="sm">
            Adjust
          </Button>
        </div>
      </Card>

      <Card className="rounded-ds-2xl border border-border/60 bg-card/95 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Streak</p>
            <p className="text-h4 font-semibold text-foreground">{streak} days</p>
          </div>
          <Icon name="Flame" size={24} className="text-primary" />
        </div>
        <p className="mt-3 text-small text-mutedText">Protect the streak to keep AI boosters unlocked.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="soft" tone="primary" size="sm">
            Best {longestStreak} days
          </Badge>
          <Badge variant="soft" tone="accent" size="sm">
            Shields {shields}
          </Badge>
        </div>
      </Card>

      <Card className="rounded-ds-2xl border border-border/60 bg-card/95 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Weekly challenge</p>
            <p className="text-h4 font-semibold text-foreground">{hasChallenge ? 'In progress' : 'Join today'}</p>
          </div>
          <Icon name="Trophy" size={24} className="text-primary" />
        </div>
        <p className="mt-3 text-small text-mutedText">
          {hasChallenge
            ? 'You are tracking this cohort—finish today’s task to stay on pace.'
            : 'Join the cohort challenge to compete with peers this week.'}
        </p>
        <div className="mt-4">
          {hasChallenge ? (
            <Button href="/community/challenges" size="sm">
              View challenge
            </Button>
          ) : (
            <Button href="#weekly-challenge" size="sm">
              Join challenge
            </Button>
          )}
        </div>
      </Card>

      <Card className="rounded-ds-2xl border border-border/60 bg-card/95 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption uppercase tracking-[0.18em] text-mutedText">Share the win</p>
            <p className="text-h4 font-semibold text-foreground">Invite a friend</p>
          </div>
          <Icon name="Share2" size={24} className="text-primary" />
        </div>
        <p className="mt-3 text-small text-mutedText">Celebrate your momentum and keep accountability high.</p>
        <div className="mt-4">
          <Button onClick={onShare} size="sm" variant="soft" tone="primary">
            Share progress
          </Button>
        </div>
      </Card>
    </div>
  );
};

DashboardSnapshot.displayName = 'DashboardSnapshot';

export default DashboardSnapshot;
