// pages/mock/listening/review.tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import Icon from '@/components/design-system/Icon';
import { supabase } from '@/lib/supabaseClient';
import ReviewScreen from '@/components/listening/ReviewScreen';

type ListeningProgressStats = {
  totalAttempts: number;
  attemptsWithScore: number;
  lastBand: number | null;
  bestBand: number | null;
  avgBand: number | null;
  avgRawScore: number | null;
  totalTimeMinutes: number | null;
};

export default function ListeningReviewPage() {
  const { slug, attempt } = useRouter().query as { slug?: string; attempt?: string };

  const [stats, setStats] = useState<ListeningProgressStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingStats(true);
      setStatsError(null);

      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError || !userResult?.user) {
        if (!cancelled) {
          setIsAuthed(false);
          setStats(null);
          setLoadingStats(false);
        }
        return;
      }

      const userId = userResult.user.id;
      setIsAuthed(true);

      const { data, error } = await supabase
        .from('attempts_listening')
        .select(
          'band_score, raw_score, total_questions, time_spent_seconds, submitted_at, created_at'
        )
        .eq('user_id', userId)
        .eq('status', 'submitted')
        .not('band_score', 'is', null)
        .order('submitted_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setStatsError(error.message ?? 'Failed to load listening progress');
        setLoadingStats(false);
        return;
      }

      const rows =
        (data ?? []) as {
          band_score: number | string | null;
          raw_score: number | null;
          total_questions: number;
          time_spent_seconds: number | null;
          submitted_at: string | null;
          created_at: string;
        }[];

      if (rows.length === 0) {
        setStats({
          totalAttempts: 0,
          attemptsWithScore: 0,
          lastBand: null,
          bestBand: null,
          avgBand: null,
          avgRawScore: null,
          totalTimeMinutes: null,
        });
        setLoadingStats(false);
        return;
      }

      const totalAttempts = rows.length;

      const bandScores: number[] = rows
        .map((r) =>
          r.band_score == null
            ? null
            : typeof r.band_score === 'number'
            ? r.band_score
            : Number(r.band_score)
        )
        .filter((v): v is number => Number.isFinite(v));

      const attemptsWithScore = bandScores.length;

      const lastBand = bandScores[0] ?? null;
      const bestBand =
        bandScores.length > 0
          ? bandScores.reduce((max, v) => (v > max ? v : max), bandScores[0])
          : null;
      const avgBand =
        bandScores.length > 0
          ? Number(
              (bandScores.reduce((sum, v) => sum + v, 0) / bandScores.length).toFixed(1)
            )
          : null;

      const rawScores: number[] = rows
        .map((r) => (typeof r.raw_score === 'number' ? r.raw_score : null))
        .filter((v): v is number => Number.isFinite(v));

      const avgRawScore =
        rawScores.length > 0
          ? Number(
              (rawScores.reduce((sum, v) => sum + v, 0) / rawScores.length).toFixed(1)
            )
          : null;

      const totalTimeSeconds = rows
        .map((r) => (typeof r.time_spent_seconds === 'number' ? r.time_spent_seconds : 0))
        .reduce((sum, v) => sum + v, 0);

      const totalTimeMinutes =
        totalTimeSeconds > 0 ? Number((totalTimeSeconds / 60).toFixed(1)) : null;

      setStats({
        totalAttempts,
        attemptsWithScore,
        lastBand,
        bestBand,
        avgBand,
        avgRawScore,
        totalTimeMinutes,
      });
      setLoadingStats(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!slug) return null;

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        {/* 1) Existing detailed review for this attempt */}
        <ReviewScreen slug={slug} attemptId={attempt ?? null} />

        {/* 2) Cumulative listening progress for this user */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Icon name="Headphones" className="h-4 w-4 text-primary" />
              Listening progress
            </h2>
            {isAuthed === false && (
              <Badge variant="neutral" size="sm">
                Sign in to track progress
              </Badge>
            )}
          </div>

          <Card className="card-surface rounded-ds-2xl p-4 sm:p-5">
            {loadingStats ? (
              <div className="grid gap-3 sm:grid-cols-4 text-sm text-muted-foreground">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted/60 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="text-xs text-muted-foreground">
                Couldn&apos;t load listening stats right now.
              </div>
            ) : !stats || stats.totalAttempts === 0 ? (
              <div className="text-xs text-muted-foreground">
                No finished listening attempts with scores yet. Complete a mock to see your stats
                here.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-4 text-sm">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Attempts (scored)
                  </div>
                  <div className="text-base font-semibold">
                    {stats.attemptsWithScore} / {stats.totalAttempts}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Last band
                  </div>
                  <div className="text-base font-semibold">
                    {stats.lastBand ?? '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Best band
                  </div>
                  <div className="text-base font-semibold">
                    {stats.bestBand ?? '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Avg band
                  </div>
                  <div className="text-base font-semibold">
                    {stats.avgBand ?? '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Avg raw score
                  </div>
                  <div className="text-base font-semibold">
                    {stats.avgRawScore ?? '—'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Time spent (total)
                  </div>
                  <div className="text-base font-semibold">
                    {stats.totalTimeMinutes != null ? `${stats.totalTimeMinutes} min` : '—'}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </Container>
    </section>
  );
}
