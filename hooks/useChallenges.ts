import * as React from 'react';
import useSWR from 'swr';

import { authHeaders } from '@/lib/supabaseBrowser';
import type { ChallengeLeaderboardEntry } from '@/types/challenge';
import type { ChallengeDefinition, ChallengeProgress } from '@/pages/api/gamification/challenges';

type LeaderboardResponse = {
  ok: boolean;
  leaderboard?: ChallengeLeaderboardEntry[];
  error?: string;
};

type ChallengesResponse = {
  ok: boolean;
  challenges?: ChallengeDefinition[];
  error?: string;
};

type ProgressMutationResponse =
  | {
      ok: true;
      xpAwarded: number;
      progress: ChallengeProgress;
    }
  | {
      ok: false;
      error: string;
    };

type UseChallengesOptions = {
  leaderboardLimit?: number;
};

async function fetchLeaderboard(url: string): Promise<ChallengeLeaderboardEntry[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard');
  }

  const payload = (await response.json()) as LeaderboardResponse;
  if (!payload.ok || !payload.leaderboard) {
    throw new Error(payload.error || 'Unable to load leaderboard.');
  }

  return payload.leaderboard;
}

async function fetchChallenges(url: string): Promise<ChallengeDefinition[]> {
  const response = await fetch(url, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error('Unable to load challenges');
  }

  const payload = (await response.json()) as ChallengesResponse;
  if (!payload.ok || !payload.challenges) {
    throw new Error(payload.error || 'Unable to load challenges');
  }

  return payload.challenges;
}

export function useChallenges(cohortId?: string, options?: UseChallengesOptions) {
  const leaderboardLimit = options?.leaderboardLimit ?? 3;
  const leaderboardKey = cohortId
    ? `/api/challenge/leaderboard?cohort=${encodeURIComponent(cohortId)}`
    : null;
  const challengesKey = '/api/gamification/challenges';

  const {
    data: leaderboardData,
    error: leaderboardError,
    isLoading: isLeaderboardLoading,
    isValidating: isLeaderboardValidating,
    mutate: mutateLeaderboard,
  } = useSWR<ChallengeLeaderboardEntry[]>(leaderboardKey, fetchLeaderboard);

  const {
    data: challengesData,
    error: challengesError,
    isLoading: isChallengesLoading,
    isValidating: isChallengesValidating,
    mutate: mutateChallenges,
  } = useSWR<ChallengeDefinition[]>(challengesKey, fetchChallenges);

  const [updatingChallengeId, setUpdatingChallengeId] = React.useState<string | null>(null);
  const [progressError, setProgressError] = React.useState<string | null>(null);

  const updateProgress = React.useCallback(
    async (challengeId: string) => {
      setUpdatingChallengeId(challengeId);
      setProgressError(null);

      const previousChallenges = challengesData;
      const optimisticChallenges = (challengesData ?? []).map((challenge) => {
        if (challenge.id !== challengeId) return challenge;

        const currentProgress = challenge.progress;
        const optimisticTarget = currentProgress?.target ?? challenge.goal;
        const optimisticProgressCount = Math.min(
          optimisticTarget,
          (currentProgress?.progressCount ?? 0) + 1,
        );

        return {
          ...challenge,
          progress: {
            challengeId,
            progressCount: optimisticProgressCount,
            totalMastered: (currentProgress?.totalMastered ?? 0) + 1,
            target: optimisticTarget,
            lastIncrementedAt: currentProgress?.lastIncrementedAt ?? null,
            resetsAt: currentProgress?.resetsAt ?? null,
          },
        };
      });

      await mutateChallenges(optimisticChallenges, false);

      try {
        const response = await fetch('/api/gamification/challenges/progress', {
          method: 'POST',
          headers: await authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ challengeId }),
        });

        const payload = (await response
          .json()
          .catch(() => null)) as ProgressMutationResponse | null;

        if (!response.ok || !payload || !payload.ok) {
          throw new Error(payload?.error || 'Failed to update challenge');
        }

        await mutateChallenges(
          (currentChallenges) =>
            (currentChallenges ?? []).map((challenge) =>
              challenge.id === challengeId
                ? {
                    ...challenge,
                    progress: payload.progress,
                  }
                : challenge,
            ),
          false,
        );

        await mutateChallenges();

        return payload;
      } catch (error: any) {
        await mutateChallenges(previousChallenges, false);
        const message = error?.message || 'Failed to update challenge';
        setProgressError(message);
        throw error;
      } finally {
        setUpdatingChallengeId(null);
      }
    },
    [challengesData, mutateChallenges],
  );

  const retryLeaderboard = React.useCallback(async () => {
    await mutateLeaderboard();
  }, [mutateLeaderboard]);

  const retryChallenges = React.useCallback(async () => {
    setProgressError(null);
    await mutateChallenges();
  }, [mutateChallenges]);

  const retryAll = React.useCallback(async () => {
    setProgressError(null);
    await Promise.all([mutateLeaderboard(), mutateChallenges()]);
  }, [mutateChallenges, mutateLeaderboard]);

  return {
    leaderboard: (leaderboardData ?? []).slice(0, leaderboardLimit),
    challenges: challengesData ?? [],
    leaderboardError: leaderboardError ? leaderboardError.message : null,
    challengesError: challengesError ? challengesError.message : null,
    progressError,
    isLeaderboardLoading,
    isChallengesLoading,
    isLeaderboardValidating,
    isChallengesValidating,
    updatingChallengeId,
    retryLeaderboard,
    retryChallenges,
    retryAll,
    updateProgress,
  };
}

export default useChallenges;
