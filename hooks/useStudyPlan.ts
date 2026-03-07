import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { getDayKeyInTZ } from '@/lib/streak';
import { coerceStudyPlan, planDayKey } from '@/utils/studyPlan';
import type { StudyPlan, StudyDay } from '@/types/plan';

export function useStudyPlan() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [todayTasks, setTodayTasks] = useState<StudyDay['tasks'] | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabaseBrowser.auth.getUser();
        if (!user) {
          setPlan(null);
          setTodayTasks(null);
          return;
        }

        const { data, error } = await supabaseBrowser
          .from('study_plans')
          .select('plan_json, start_iso, weeks, goal_band')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
          setPlan(null);
          setTodayTasks(null);
        } else {
          const normalised = coerceStudyPlan(data.plan_json ?? data, user.id, {
            startISO: data.start_iso ?? undefined,
            weeks: data.weeks ?? undefined,
            goalBand: data.goal_band ?? undefined,
          });
          setPlan(normalised);
          const todayKey = getDayKeyInTZ();
          const today = normalised.days.find(d => planDayKey(d) === todayKey);
          setTodayTasks(today?.tasks ?? null);
        }
      } catch (err) {
        console.error('useStudyPlan error', err);
        setPlan(null);
        setTodayTasks(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return { plan, todayTasks, loading };
}