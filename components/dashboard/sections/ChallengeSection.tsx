import { Card } from '@/components/design-system/Card';

import ChallengeSpotlightCard from '@/components/dashboard/ChallengeSpotlightCard';
import DailyWeeklyChallenges from '@/components/dashboard/DailyWeeklyChallenges';
import JoinWeeklyChallengeCard from '@/components/dashboard/JoinWeeklyChallengeCard';

type ChallengeEnrollment = {
  cohort: string;
  progress: Record<string, 'pending' | 'done' | 'skipped'> | null;
};

type ChallengeSectionProps = {
  loading: boolean;
  challengeEnrollment: ChallengeEnrollment | null;
};

export function ChallengeSection({ loading, challengeEnrollment }: ChallengeSectionProps) {
  return (
    <>
      <div className="mt-10" id="weekly-challenge">
        {loading ? (
          <Card className="rounded-ds-2xl border border-border/60 bg-card/70 p-6">
            <div className="h-6 w-40 animate-pulse rounded bg-border" />
            <div className="mt-4 h-24 w-full animate-pulse rounded bg-border" />
          </Card>
        ) : challengeEnrollment ? (
          <ChallengeSpotlightCard
            cohortId={challengeEnrollment.cohort}
            progress={challengeEnrollment.progress ?? null}
          />
        ) : (
          <JoinWeeklyChallengeCard />
        )}
      </div>

      <div className="mt-6">
        <DailyWeeklyChallenges />
      </div>
    </>
  );
}
