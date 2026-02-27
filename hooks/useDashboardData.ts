import { useEffect, useMemo, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import type { SubscriptionTier } from '@/lib/navigation/types';
import useTierFeatures from '@/hooks/useTierFeatures';

type UseDashboardDataParams = {
  userId: string | null;
  tier: SubscriptionTier;
  realtime?: boolean;
};

export type PerformanceSnapshot = {
  overallBand: number | null;
  practiceHours: number;
  studyStreak: number;
  mockTests: number;
};

export type StudyLog = {
  id: string;
  weekLabel: string;
  minutes: number;
  skill: string;
};

export type BandHistoryPoint = {
  id: string;
  weekLabel: string;
  band: number;
  lowerBand?: number | null;
  upperBand?: number | null;
  note?: string | null;
};

export type UsageLimits = {
  aiWritingUsed: number;
  aiWritingLimit: number;
  speakingAnalysisUsed: number;
  speakingAnalysisLimit: number;
};

export type DashboardData = {
  performance: PerformanceSnapshot;
  studyLogs: StudyLog[];
  bandHistory: BandHistoryPoint[];
  usageLimits: UsageLimits;
};

const emptyData: DashboardData = {
  performance: {
    overallBand: null,
    practiceHours: 0,
    studyStreak: 0,
    mockTests: 0,
  },
  studyLogs: [],
  bandHistory: [],
  usageLimits: {
    aiWritingUsed: 0,
    aiWritingLimit: 0,
    speakingAnalysisUsed: 0,
    speakingAnalysisLimit: 0,
  },
};

export function useDashboardData({ userId, tier, realtime = false }: UseDashboardDataParams) {
  const features = useTierFeatures(tier);
  const [data, setData] = useState<DashboardData>(() => ({
    ...emptyData,
    usageLimits: {
      ...emptyData.usageLimits,
      aiWritingLimit: features.aiWritingLimit,
      speakingAnalysisLimit: features.speakingAnalysisLimit,
    },
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!userId) {
        if (!active) return;
        setData((prev) => ({
          ...prev,
          usageLimits: {
            ...prev.usageLimits,
            aiWritingLimit: features.aiWritingLimit,
            speakingAnalysisLimit: features.speakingAnalysisLimit,
          },
        }));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [performanceRes, logsRes, bandRes, usageRes] = await Promise.all([
          supabaseBrowser
            .from('dashboard_performance')
            .select('overall_band,practice_hours,study_streak,mock_tests')
            .eq('user_id', userId)
            .maybeSingle(),
          supabaseBrowser
            .from('study_logs')
            .select('id,week_label,minutes,skill')
            .eq('user_id', userId)
            .order('week_label', { ascending: true }),
          supabaseBrowser
            .from('band_history')
            .select('id,week_label,band,lower_band,upper_band,note')
            .eq('user_id', userId)
            .order('week_label', { ascending: true }),
          supabaseBrowser
            .from('usage_limits')
            .select('ai_writing_used,speaking_analysis_used')
            .eq('user_id', userId)
            .maybeSingle(),
        ]);

        if (!active) return;

        const firstError =
          performanceRes.error || logsRes.error || bandRes.error || usageRes.error;

        if (firstError) {
          setError(firstError.message);
        }

        setData({
          performance: {
            overallBand: performanceRes.data?.overall_band ?? null,
            practiceHours: Number(performanceRes.data?.practice_hours ?? 0),
            studyStreak: Number(performanceRes.data?.study_streak ?? 0),
            mockTests: Number(performanceRes.data?.mock_tests ?? 0),
          },
          studyLogs: (logsRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            weekLabel: String(row.week_label ?? 'Week'),
            minutes: Number(row.minutes ?? 0),
            skill: String(row.skill ?? 'general'),
          })),
          bandHistory: (bandRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            weekLabel: String(row.week_label ?? 'Week'),
            band: Number(row.band ?? 0),
            lowerBand: row.lower_band == null ? null : Number(row.lower_band),
            upperBand: row.upper_band == null ? null : Number(row.upper_band),
            note: row.note == null ? null : String(row.note),
          })),
          usageLimits: {
            aiWritingUsed: Number(usageRes.data?.ai_writing_used ?? 0),
            aiWritingLimit: features.aiWritingLimit,
            speakingAnalysisUsed: Number(usageRes.data?.speaking_analysis_used ?? 0),
            speakingAnalysisLimit: features.speakingAnalysisLimit,
          },
        });
      } catch (caughtError) {
        if (!active) return;
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to load dashboard data';
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    const shouldSubscribeRealtime = realtime && tier === 'owl' && !!userId;
    if (!shouldSubscribeRealtime) {
      return () => {
        active = false;
      };
    }

    const channel = supabaseBrowser
      .channel(`dashboard-data-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'study_logs', filter: `user_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coach_notes', filter: `user_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'band_history', filter: `user_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'practice_completion', filter: `user_id=eq.${userId}` },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabaseBrowser.removeChannel(channel);
    };
  }, [features.aiWritingLimit, features.speakingAnalysisLimit, realtime, tier, userId]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
    }),
    [data, error, loading],
  );
}

export default useDashboardData;
