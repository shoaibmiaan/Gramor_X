import React from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';

export type LeaderboardScope = 'daily' | 'weekly';
export type LeaderboardSkill = 'xp' | 'writing';

type Props = {
  scope: LeaderboardScope;
  skill: LeaderboardSkill;
  onScopeChange: (scope: LeaderboardScope) => void;
  onSkillChange: (skill: LeaderboardSkill) => void;
};

const LeaderboardFilters: React.FC<Props> = ({ scope, skill, onScopeChange, onSkillChange }) => {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4" padding="md">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Leaderboard filters</p>
        <p className="text-xs text-muted-foreground">Switch between XP and Writing focus, and adjust the time window.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-2 rounded-ds-lg border border-border/60 bg-background/60 p-1">
          {(['daily', 'weekly'] as LeaderboardScope[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={scope === item ? 'primary' : 'ghost'}
              className="rounded-ds-md"
              onClick={() => onScopeChange(item)}
            >
              {item === 'daily' ? 'Daily' : 'Weekly'}
            </Button>
          ))}
        </div>
        <div className="inline-flex gap-2 rounded-ds-lg border border-border/60 bg-background/60 p-1">
          {([
            { key: 'xp', label: 'All XP' },
            { key: 'writing', label: 'Writing' },
          ] as { key: LeaderboardSkill; label: string }[]).map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={skill === item.key ? 'primary' : 'ghost'}
              className="rounded-ds-md"
              onClick={() => onSkillChange(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default LeaderboardFilters;
