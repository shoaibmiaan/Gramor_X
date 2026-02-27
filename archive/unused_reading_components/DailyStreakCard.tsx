import * as React from 'react';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

// Props for the DailyStreakCard. The streak consists of the current
// consecutive days of activity and the longest streak ever achieved.
type DailyStreakProps = {
  streak: {
    currentStreak: number;
    longestStreak: number;
  };
};

/**
 * Displays the user's current and longest Reading streaks. This
 * component provides a simple visual indicator to motivate users to
 * maintain their daily habit.
 */
export const DailyStreakCard: React.FC<DailyStreakProps> = ({ streak }) => {
  const { currentStreak, longestStreak } = streak;
  return (
    <Card className="p-4 flex items-center justify-between text-xs">
      <div className="space-y-0.5">
        <p className="font-medium">
          Current streak: {currentStreak} day{currentStreak === 1 ? '' : 's'}
        </p>
        <p className="text-muted-foreground">
          Longest streak: {longestStreak} day{longestStreak === 1 ? '' : 's'}
        </p>
      </div>
      <Badge size="xs" variant="outline">
        Keep it up!
      </Badge>
    </Card>
  );
};

export default DailyStreakCard;
