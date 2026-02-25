// pages/writing/mock/[mockId]/start.tsx
import React, { useCallback, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { toast } from '@/components/design-system/Toaster';

import { writingExamSummaries, type WritingExamSummary } from '@/data/writing/exam-index';
import { getServerClient } from '@/lib/supabaseServer';
import { setMockAttemptId } from '@/lib/mock/state';
import { api, isQuotaExceeded } from '@/lib/http';

interface LatestAttempt {
  attemptId: string;
  status: string;
  startedAt: string | null;
}

interface PageProps {
  mockId: string;
  summary: WritingExamSummary;
  latestAttempt: LatestAttempt | null;
}

const formatAttemptStatus = (status: string) => {
  switch (status) {
    case 'in_progress':
      return 'In progress';
    case 'submitted':
    case 'completed':
      return 'Submitted';
    default:
      return status.replace(/_/g, ' ');
  }
};

const formatTimestamp = (iso: string | null) => {
  if (!iso) return 'Not available';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const WritingMockStartPage: React.FC<PageProps> = ({ mockId, summary, latestAttempt }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBegin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ attempt: { id: string } }>('/api/mock/writing/start', {
        method: 'POST',
        body: JSON.stringify({ promptId: mockId, mockId }),
      });

      setMockAttemptId('writing', mockId, data.attempt.id);
      await router.push(`/writing/mock/${data.attempt.id}/workspace`);
    } catch (e: any) {
      if (isQuotaExceeded(e)) {
        const moduleName = (e.meta?.module as string) || 'writing';
        const remaining = (e.meta?.remaining ?? 0) as number;
        const resetAtISO = (e.meta?.resetAt as string | undefined) || null;

        toast.error(`No ${moduleName} attempts left.`, {
          description: resetAtISO
            ? `Quota resets ${new Date(resetAtISO).toLocaleString()}.`
            : 'Upgrade to continue.',
          duration: 5000,
        });

        // NEW: route to quota+subscription overview with context
        const usp = new URLSearchParams({
          reason: 'quota_limit',
          from: router.asPath,
          qk: 'writing_mock_attempts',
        });
        if (remaining != null) usp.set('remaining', String(remaining));
        if (resetAtISO) usp.set('resetAt', resetAtISO);

        setTimeout(() => router.push(`/pricing/overview?${usp.toString()}`), 250);
        return;
      }

      setError(e?.error ?? e?.message ?? 'Unexpected error while starting the mock test');
    } finally {
      setLoading(false);
    }
  }, [mockId, router]);

  const handleResume = useCallback(async () => {
    if (!latestAttempt) return;
    setMockAttemptId('writing', mockId, latestAttempt.attemptId);
    await router.push(`/writing/mock/${latestAttempt.attemptId}/workspace`);
  }, [latestAttempt, mockId, router]);

  return (
    <Container className="py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="space-y-3">
          <Link href="/writing/mock" className="text-sm text-primary underline">
            ← Back to writing mock library
          </Link>
          <h1 className="text-3xl font-semibold text-foreground">{summary.title}</h1>
          <p className="text-sm text-muted-foreground">{summary.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="info" size="sm">{summary.task1Type}</Badge>
            <Badge variant="secondary" size="sm">Task 1: {summary.task1Focus}</Badge>
            <Badge variant="secondary" size="sm">Task 2: {summary.task2Focus}</Badge>
            <Badge variant="ghost" size="sm">{summary.durationMinutes} minutes</Badge>
            {summary.register ? <Badge variant="outline" size="sm">{summary.register}</Badge> : null}
          </div>
        </div>

        {latestAttempt ? (
          <Card className="rounded-ds-2xl border border-info/40 bg-info/10 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-info">Last attempt</p>
                <p className="text-sm text-muted-foreground">
                  Status: {formatAttemptStatus(latestAttempt.status)} · Started {formatTimestamp(latestAttempt.startedAt)}
                </p>
              </div>
              {latestAttempt.status === 'in_progress' ? (
                <Button onClick={handleResume} variant="secondary" className="rounded-ds">
                  Resume attempt
                </Button>
              ) : (
                <Button
                  href={`/writing/mock/${latestAttempt.attemptId}/results`}
                  variant="secondary"
                  className="rounded-ds"
                >
                  View last results
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        <Card className="card-surface rounded-ds-2xl p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Before you begin</h2>
            <p className="text-sm text-muted-foreground">
              You&apos;ll complete Task 1 and Task 2 in one sitting. Autosave keeps your work safe every few seconds and focus guard pauses the timer if you leave the tab.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-ds-xl border border-border/50 bg-background/80 p-4 text-sm">
              <p className="font-medium text-foreground">Timing &amp; word targets</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                <li>60 minutes total (20 for Task 1, 40 for Task 2)</li>
                <li>Minimum 150 words for Task 1</li>
                <li>Minimum 250 words for Task 2</li>
              </ul>
            </Card>
            <Card className="rounded-ds-xl border border-border/50 bg-background/80 p-4 text-sm">
              <p className="font-medium text-foreground">Scoring criteria</p>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                <li>Task achievement / response</li>
                <li>Coherence and cohesion</li>
                <li>Lexical resource</li>
                <li>Grammatical range and accuracy</li>
              </ul>
            </Card>
          </div>

          <div className="rounded-ds-xl border border-muted/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              Stay in full-screen if possible, close extra tabs, and keep notifications off. We track focus to mirror exam conditions and let you review idle time after submitting.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleBegin} disabled={loading} variant="primary" className="rounded-ds">
              {loading ? 'Preparing...' : 'Begin test'}
            </Button>
            <Button href="/writing/mock" variant="ghost" className="rounded-ds">
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req as any, ctx.res as any);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: '/welcome',
        permanent: false,
      },
    };
  }

  const { mockId } = ctx.params as { mockId: string };
  const summary = writingExamSummaries.find((paper) => paper.id === mockId);
  if (!summary) {
    return { notFound: true };
  }

  const { data: latest } = await supabase
    .from('exam_attempts')
    .select('id, status, started_at, metadata')
    .eq('user_id', user.id)
    .eq('exam_type', 'writing')
    .order('created_at', { ascending: false })
    .limit(5);

  const latestAttempt = (latest ?? []).find((row) => {
    const metadata = (row.metadata as Record<string, unknown> | null) ?? null;
    return typeof metadata?.mockId === 'string' && metadata.mockId === mockId;
  });

  return {
    props: {
      mockId,
      summary,
      latestAttempt: latestAttempt
        ? {
            attemptId: latestAttempt.id,
            status: latestAttempt.status ?? 'in_progress',
            startedAt: latestAttempt.started_at ?? null,
          }
        : null,
    },
  };
};

export default WritingMockStartPage;
