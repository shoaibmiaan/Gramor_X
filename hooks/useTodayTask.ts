import { useAIStudyPlan } from './useAIStudyPlan';
import type { DayTask } from '@/types/study-plan';

export function useTodayTask() {
  const { plan, loading, error } = useAIStudyPlan();

  const todayTasks: DayTask[] = plan?.getTodayTasks?.() ?? [];

  return {
    tasks: todayTasks,
    loading,
    error,
  };
}