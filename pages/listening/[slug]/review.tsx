// pages/listening/review.tsx
// or /listening/[slug]/review.tsx depending on your routing
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { supabase } from '@/lib/supabaseClient';
import ReviewScreen from '@/components/listening/ReviewScreen';
import Icon from '@/components/design-system/Icon';

type ProgressStats = {
  totalAttempts: number;
  lastBand: number | null;
  bestBand: number | null;
  avgBand: number | null;
};

export default function ListeningReviewPage() {
  const { slug, attemptId } = useRouter().query as { slug?: string; attemptId?: string };

  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Load cumulative progress for Listening module for the current user
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingStats(true);
      setStatsError(null);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setLoadingStats(false);
        return;
      }

      const { data, error } = await supabase
        .from('lm_listening_attempts')
        .select('band_score, created_at, test_slug')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        setStatsError(error.message ?? 'Failed to load progress');
        setLoadingStats(false);
        return;
      }

      const attempts = (data ?? []).filter(
        (row) => typeof row.band_score === 'number',
      ) as {
        band_score: number;
        created_at: string;
        test_slug: string;
      }[];

      if (attempts.length === 0) {
        setStats({
          totalAttempts: 0,
          lastBand: null,
          bestBand: null,
          avgBand: null,
        });
        setLoadingStats(false);
        return;
      }

      const totalAttempts = attempts.length;
      const lastBand = attempts[0]?.band_score ?? null;
      const bestBand = attempts.reduce(
        (max, row) => (row.band_score > max ? row.band_score : max),
        attempts[0].band_score,
      );
      const avgBand =
        attempts.reduce((sum, row) => sum + row.band_score, 0) / totalAttempts;

      setStats({
        totalAttempts,
        lastBand,
        bestBand,
        avgBand: Number.isFinite(avgBand) ? Number(avgBand.toFixed(1)) : null,
      });
      setLoadingStats(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!slug) return null;

  return (
    <>
      <Head>
        <title>Listening Review • GramorX</title>
        <meta
          name="description"
          content="Detailed review of your IELTS-style listening attempt with module progress."
        />
      </Head>

      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          {/* 1) Detailed review of this attempt */}
          <ReviewScreen slug={slug} attemptId={attemptId ?? null} />

          {/* 2) Cumulative progress for Listening module */}
          <div className="mt-10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Listening progress
              </h2>
              {stats && stats.totalAttempts > 0 && (
                <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge tone="info" size="xs">
                    Attempts: {stats.totalAttempts}
                  </Badge>
                  <Badge tone="success" size="xs">
                    Best: {stats.bestBand ?? '—'}
                  </Badge>
                </div>
              )}
            </div>

            <Card className="card-surface rounded-ds-2xl p-4 sm:p-5">
              {loadingStats ? (
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
                </div>
              ) : statsError ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon name="AlertTriangle" size={14} />
                  <span>Couldn&apos;t load progress right now.</span>
                </div>
              ) : !stats || stats.totalAttempts === 0 ? (
                <div className="text-xs text-muted-foreground">
                  No saved attempts yet. Your listening stats will appear here after you complete
                  tests while signed in.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total attempts
                    </div>
                    <div className="text-base font-semibold">{stats.totalAttempts}</div>
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
                      Average band
                    </div>
                    <div className="text-base font-semibold">
                      {stats.avgBand ?? '—'}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Container>
      </section>
    </>
  );
}
