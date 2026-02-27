import * as React from 'react';

import { Badge as Pill } from '@/components/design-system/Badge';
import type { Badge } from '@/data/badges';

export type BadgeStripProps = {
  badges: ReadonlyArray<Badge>;
  unlocked?: ReadonlyArray<string>;
  className?: string;
};

export function BadgeStrip({ badges, unlocked = [], className }: BadgeStripProps) {
  if (!badges.length) return null;
  const unlockedSet = new Set(unlocked);

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {badges.map((badge) => {
        const isUnlocked = unlockedSet.has(badge.id);
        return (
          <Pill
            key={badge.id}
            variant={isUnlocked ? 'success' : 'neutral'}
            size="md"
            className={`gap-2 rounded-2xl ${isUnlocked ? 'shadow-sm shadow-success/20' : 'opacity-80'}`}
          >
            <span aria-hidden className="text-lg leading-none">
              {badge.icon}
            </span>
            <span className="text-small font-medium">{badge.label}</span>
            <span className="sr-only">{isUnlocked ? 'Unlocked' : 'Locked'}</span>
          </Pill>
        );
      })}
    </div>
  );
}

export default BadgeStrip;
