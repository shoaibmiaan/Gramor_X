import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import useDashboard, {
  useEstimatedBandScore,
  useImprovementGraph,
  useSkillHeatmap,
  useStrengthsWeaknesses,
  useStudyStreak,
} from '@/hooks/useDashboard';
import {
  AnalyticsSection,
  IdentityStatusSection,
  MotivationSection,
  NextActionsSection,
  UtilitiesSection,
} from '@/components/dashboard/sections';

const AICommandCenter = dynamic(
  () => import('@/components/dashboard/AICommandCenter').then((mod) => mod.AICommandCenter),
  {
    loading: () => <p className="text-xs text-muted-foreground">Loading AI command center…</p>,
  },
);

const DashboardPage: NextPage = () => {
  const fetcher = async (url: string) => {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('fetch_failed');
    return res.json();
  };

  const { isLoading, error } = useDashboard();
  const { score } = useEstimatedBandScore();
  const { heatmap } = useSkillHeatmap();
  const { strengths, weaknesses } = useStrengthsWeaknesses();
  const { streak } = useStudyStreak();
  const { points } = useImprovementGraph();
  const { data: recommendations } = useSWR('/api/recommendations', fetcher);
  const { data: prediction } = useSWR('/api/prediction', fetcher);
  const [whatIfWriting, setWhatIfWriting] = useState(7);
  const whatIfPayload = useMemo(() => ({ writing: whatIfWriting }), [whatIfWriting]);
  const { data: whatIf } = useSWR(
    ['/api/prediction/what-if', whatIfPayload],
    async ([url, payload]) => {
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('what_if_failed');
      return res.json();
    },
  );

  return (
    <>
      <section className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            Failed to load dashboard analytics.
          </div>
        ) : null}

        <IdentityStatusSection
          prediction={prediction}
          score={score}
          streak={streak}
          heatmap={heatmap}
          strengths={strengths}
          weaknesses={weaknesses}
        />

        <NextActionsSection recommendations={recommendations?.nextExercises ?? []} />
        <AnalyticsSection points={points} />
        <MotivationSection streak={streak} />
        <UtilitiesSection
          whatIfWriting={whatIfWriting}
          setWhatIfWriting={setWhatIfWriting}
          whatIf={whatIf}
        />

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading dashboard analytics…</p>
        ) : null}
      </section>
      <AICommandCenter />
    </>
  );
};

export default DashboardPage;
