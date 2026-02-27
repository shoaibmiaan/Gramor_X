import React from 'react';
import Link from 'next/link';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

export const JoinWeeklyChallengeCard: React.FC = () => {
  return (
    <Card className="relative overflow-hidden rounded-ds-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-6">
      <div className="absolute -right-24 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" aria-hidden />

      <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex-1 space-y-3">
          <Badge variant="accent" size="sm" className="uppercase tracking-wide">
            Weekly Challenge
          </Badge>
          <h3 className="font-slab text-h3 text-foreground">Join the Weekly Challenge</h3>
          <p className="text-body text-grayish">
            Complete guided micro-tasks every day, collect points, and push your IELTS score faster alongside the
            community.
          </p>
          <ul className="mt-2 space-y-2 text-small text-grayish">
            <li className="flex items-start gap-2">
              <span className="text-base" aria-hidden>
                ⚡
              </span>
              <span>Daily checklist with smart reminders</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base" aria-hidden>
                🏅
              </span>
              <span>Earn challenge points and unlock badges</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-base" aria-hidden>
                🤝
              </span>
              <span>Compete with peers on the live leaderboard</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-start gap-3 md:w-60">
          <div className="rounded-ds-xl border border-primary/30 bg-background/80 px-4 py-3 text-left">
            <p className="text-caption uppercase tracking-wide text-grayish">This week&rsquo;s target</p>
            <p className="text-body font-semibold text-foreground">Complete 9 tasks · Earn 180+ points</p>
          </div>
          <Link href="/challenge" className="w-full">
            <Button variant="primary" className="w-full rounded-ds-xl">
              Join now
            </Button>
          </Link>
          <Link href="/leaderboard" className="w-full">
            <Button variant="secondary" className="w-full rounded-ds-xl">
              View leaderboard
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default JoinWeeklyChallengeCard;
