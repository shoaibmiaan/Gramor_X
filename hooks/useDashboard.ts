import useSWR from 'swr';

type DashboardPayload = {
  estimatedBand: number | null;
  heatmap: Array<{ skill: string; score: number }>;
  strengths: Array<{ skill: string; score: number }>;
  weaknesses: Array<{ skill: string; score: number }>;
  studyStreak: number;
  improvement: Array<{ label: string; band: number }>;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('dashboard_fetch_failed');
  return (await res.json()) as DashboardPayload;
};

export function useDashboard() {
  return useSWR('/api/dashboard/overview', fetcher, { revalidateOnFocus: true });
}

export function useEstimatedBandScore() {
  const { data, error, isLoading } = useDashboard();
  return { score: data?.estimatedBand ?? null, error, isLoading };
}

export function useSkillHeatmap() {
  const { data, error, isLoading } = useDashboard();
  return { heatmap: data?.heatmap ?? [], error, isLoading };
}

export function useStrengthsWeaknesses() {
  const { data, error, isLoading } = useDashboard();
  return { strengths: data?.strengths ?? [], weaknesses: data?.weaknesses ?? [], error, isLoading };
}

export function useStudyStreak() {
  const { data, error, isLoading } = useDashboard();
  return { streak: data?.studyStreak ?? 0, error, isLoading };
}

export function useImprovementGraph() {
  const { data, error, isLoading } = useDashboard();
  return { points: data?.improvement ?? [], error, isLoading };
}

export default useDashboard;
