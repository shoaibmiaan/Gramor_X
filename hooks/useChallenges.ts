// hooks/useChallenges.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { ChallengeDefinition, ChallengeProgressItem } from '@/types/dashboard';

async function fetchChallenges(userId: string): Promise<ChallengeDefinition[]> {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      *,
      progress:challenge_progress!left(
        challengeId:challenge_id,
        progressCount:progress_count,
        totalMastered:total_mastered,
        target,
        lastIncrementedAt:last_incremented_at,
        resetsAt:resets_at
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;

  // Map progress into the challenge object
  return (data || []).map(ch => ({
    ...ch,
    progress: ch.progress?.[0] ?? null,
  }));
}

async function incrementChallengeProgress(challengeId: string): Promise<{ xpAwarded?: number; progress: ChallengeProgressItem }> {
  const res = await fetch('/api/gamification/challenges/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update progress');
  }

  return res.json();
}

export function useChallenges(userId: string | null) {
  const queryClient = useQueryClient();

  const challengesQuery = useQuery({
    queryKey: ['challenges', userId],
    queryFn: () => fetchChallenges(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const incrementMutation = useMutation({
    mutationFn: incrementChallengeProgress,
    onSuccess: (data, challengeId) => {
      // Update the challenge in the cache
      queryClient.setQueryData(['challenges', userId], (old: ChallengeDefinition[] | undefined) => {
        if (!old) return old;
        return old.map(ch =>
          ch.id === challengeId ? { ...ch, progress: data.progress } : ch
        );
      });
    },
  });

  return {
    challenges: challengesQuery.data || [],
    isLoading: challengesQuery.isLoading,
    error: challengesQuery.error,
    increment: incrementMutation.mutate,
    isIncrementing: incrementMutation.isPending,
  };
}