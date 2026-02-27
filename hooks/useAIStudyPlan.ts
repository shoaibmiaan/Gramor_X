import { useEffect, useState } from 'react';
import { useUser } from './useUser';
import { getActiveStudyPlan } from '@/lib/db/studyPlan';
import type { StudyPlan } from '@/types/study-plan';

export function useAIStudyPlan() {
  const { user } = useUser();
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPlan = async () => {
      try {
        const data = await getActiveStudyPlan(user.id);
        setPlan(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [user]);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getActiveStudyPlan(user.id);
      setPlan(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { plan, loading, error, refresh };
}