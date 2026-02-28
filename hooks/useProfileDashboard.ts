import useSWR from 'swr';
import { fetchProfileDashboardData } from '@/services/accountService';

export function useProfileDashboard() {
  const { data, error, isLoading, mutate } = useSWR('profile-dashboard', fetchProfileDashboardData, {
    revalidateOnFocus: false,
  });

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}

export default useProfileDashboard;
