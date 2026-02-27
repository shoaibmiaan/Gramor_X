import * as React from 'react';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';

// Props for the DailyChallengeBanner. It accepts the current streak
// count so that the message can encourage users to continue.
type DailyChallengeBannerProps = {
  streakCurrent: number;
};

/**
 * A small banner displayed on the Reading mocks home page to remind
 * users about the daily challenge. It shows the current streak and
 * encourages users to complete today's challenge to keep the streak
 * alive.
 */
export const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({ streakCurrent }) => {
  return (
    <Card className="p-4 flex items-center justify-between text-xs">
      <div className="space-y-0.5">
        <p className="font-medium">Daily challenge</p>
        <p className="text-muted-foreground">
          You have a {streakCurrent}-day streak. Complete today’s challenge to maintain it.
        </p>
      </div>
      <Badge size="xs" variant="outline">
        Day {streakCurrent}
      </Badge>
    </Card>
  );
};

export default DailyChallengeBanner;
