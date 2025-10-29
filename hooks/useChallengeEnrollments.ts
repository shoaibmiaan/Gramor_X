import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ChallengeEnrollmentSummary } from '@/lib/challengeClient';
import { fetchChallengeEnrollments } from '@/lib/challengeClient';

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Failed to load challenge enrollments';
}

export function useChallengeEnrollments(userId: string | null) {
  const [enrollments, setEnrollments] = useState<ChallengeEnrollmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setEnrollments([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchChallengeEnrollments(userId)
      .then((data) => {
        if (!cancelled) {
          setEnrollments(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[challenge] enrollment load error:', err);
          setEnrollments([]);
          setError(toErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const latestEnrollment = useMemo(
    () => (enrollments.length > 0 ? enrollments[0] : null),
    [enrollments],
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setEnrollments([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchChallengeEnrollments(userId);
      setEnrollments(data);
      setError(null);
    } catch (err) {
      console.error('[challenge] enrollment refresh error:', err);
      setEnrollments([]);
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    enrollments,
    latestEnrollment,
    loading,
    error,
    refresh,
  };
}

export type { ChallengeEnrollmentSummary };
