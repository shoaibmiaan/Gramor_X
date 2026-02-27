// pages/writing/mock/index.tsx
import React, { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';

import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { ModuleMockShell, ModuleMockShellSection } from '@/components/mock-tests/ModuleMockShell';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/design-system/Tabs';
import { writingExamSummaries } from '@/data/writing/exam-index';
import { getServerClient } from '@/lib/supabaseServer';

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatBand = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(1);
};

type AttemptStatus = 'in_progress' | 'completed' | 'reviewed';

type AttemptHistory = {
  attemptId: string;
  mockId: string | null;
  title: string;
  taskLabel: string;
  startedAt: string;
  status: AttemptStatus;
  aiBand: number | null;
  teacherBand: number | null;
};

interface PageProps {
  history: AttemptHistory[];
}

const tabOrder = ['full', 'task1', 'task2'] as const;
type TabKey = (typeof tabOrder)[number];

const tabs: Record<TabKey, { label: string; helper: string }> = {
  full: {
    label: 'Full Mock',
    helper: 'Complete Task 1 and Task 2 together with a 60 minute timer.',
  },
  task1: {
    label: 'Task 1',
    helper: 'Focus on visuals, letters, and data commentary prompts.',
  },
  task2: {
    label: 'Task 2',
    helper: 'Essay questions covering opinion, discussion, and problem/solution styles.',
  },
};

const summaryMap = new Map(writingExamSummaries.map((paper) => [paper.id, paper]));

const filterSummaries = (key: TabKey) => {
  switch (key) {
    case 'task1':
      return writingExamSummaries.filter((paper) => paper.task1Focus);
    case 'task2':
      return writingExamSummaries.filter((paper) => paper.task2Focus);
    case 'full':
    default:
      return writingExamSummaries;
  }
};

const statusBadgeTone: Record<AttemptStatus, 'info' | 'neutral' | 'success'> = {
  in_progress: 'info',
  completed: 'neutral',
  reviewed: 'success',
};

const statusLabelText: Record<AttemptStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
};

const actionCopy: Record<AttemptStatus, { label: string; href: (attemptId: string, mockId: string | null) => string }> = {
  in_progress: {
    label: 'Resume',
    href: (attemptId) => `/writing/mock/${attemptId}/workspace`,
  },
  completed: {
    label: 'View results',
    href: (attemptId) => `/writing/mock/${attemptId}/results`,
  },
  reviewed: {
    label: 'Open review',
    href: (attemptId) => `/writing/mock/${attemptId}/review`,
  },
};

const WritingMockIndexPage: React.FC<PageProps> = ({ history }) => {
  const [tab, setTab] = useState<TabKey>('full');

  const activeSummaries = useMemo(() => filterSummaries(tab), [tab]);
  const primarySummary = activeSummaries[0] ?? writingExamSummaries[0] ?? null;
  const moduleDuration = writingExamSummaries[0]?.durationMinutes ?? 60;

  return (
    <ModuleMockShell
      title="IELTS Writing Mock Tests"
      description="Simulate the full 60-minute module with autosave, idle detection, and AI band scoring across Task Achievement, Coherence, Lexical Resource, and Grammar."
      heroVariant="split"
      badges={
        <>
          <Badge variant="neutral" size="sm">Autosave every 10s</Badge>
          <Badge variant="neutral" size="sm">Focus guard enabled</Badge>
          <Badge variant="neutral" size="sm">Instant band breakdown</Badge>
        </>
      }
      actions={
        primarySummary ? (
          <Button
            href={`/writing/mock/${primarySummary.id}/start`}
            variant="primary"
            size="lg"
            className="rounded-ds"
          >
            Start new test
          </Button>
        ) : null
      }
      stats={[
        {
          label: 'Module duration',
          value: `${moduleDuration} mins`,
          helper: 'Full Task 1 + Task 2 timing',
        },
        {
          label: 'Mock library',
          value: `${writingExamSummaries.length} sets`,
          helper: 'Academic & General Training prompts',
        },
        {
          label: 'Feedback coverage',
          value: '4 band criteria',
          helper: 'Task • Coherence • Lexical • Grammar',
        },
      ]}
    >
      <ModuleMockShellSection>
        <Tabs defaultValue="full" value={tab} onValueChange={(value) => setTab(value as TabKey)}>
          <TabsList>
            {tabOrder.map((key) => (
              <TabsTrigger key={key} value={key}>
                {tabs[key].label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabOrder.map((key) => (
            <TabsContent key={key} value={key}>
              <p className="text-sm text-muted-foreground">{tabs[key].helper}</p>
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filterSummaries(key).map((paper) => (
                  <Card key={paper.id} className="card-surface h-full rounded-ds-2xl p-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">{paper.title}</h2>
                        <Badge variant="info" size="sm">{paper.task1Type}</Badge>
                        {paper.register ? <Badge variant="outline" size="sm">{paper.register}</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{paper.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {key !== 'task2' ? (
                          <Badge variant="neutral" size="sm">Task 1: {paper.task1Focus}</Badge>
                        ) : null}
                        {key !== 'task1' ? (
                          <Badge variant="secondary" size="sm">Task 2: {paper.task2Focus}</Badge>
                        ) : null}
                        <Badge variant="ghost" size="sm">{paper.durationMinutes} minutes</Badge>
                      </div>
                      <Button href={`/writing/mock/${paper.id}/start`} variant="primary" className="mt-2 w-fit rounded-ds">
                        {key === 'task1' ? 'Practice Task 1' : key === 'task2' ? 'Practice Task 2' : 'Start full mock'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </ModuleMockShellSection>

      <ModuleMockShellSection as="section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h3 font-semibold text-foreground">Recent attempts</h2>
            <p className="text-sm text-muted-foreground">Track submissions, AI scores, and review progress.</p>
          </div>
          <Button href="/writing/progress" variant="ghost" size="sm" className="rounded-ds">
            View analytics
          </Button>
        </div>

        <Card className="card-surface rounded-ds-2xl p-0">
          {history.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No attempts yet. Start a mock to see your scores and feedback here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/60 text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Test</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Started</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">AI band</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Teacher band</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {history.map((entry) => {
                    const action = actionCopy[entry.status];
                    const statusTone = statusBadgeTone[entry.status];
                    return (
                      <tr key={entry.attemptId} className="bg-background/80">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{entry.title}</span>
                            <span className="text-xs text-muted-foreground">{entry.taskLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(entry.startedAt)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusTone} size="sm">{statusLabelText[entry.status]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatBand(entry.aiBand)}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{formatBand(entry.teacherBand)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            href={action.href(entry.attemptId, entry.mockId)}
                            size="sm"
                            variant="secondary"
                            className="rounded-ds"
                          >
                            {action.label}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </ModuleMockShellSection>
    </ModuleMockShell>
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

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('id, user_id, status, started_at, submitted_at, updated_at, metadata')
    .eq('user_id', user.id)
    .eq('exam_type', 'writing')
    .order('created_at', { ascending: false })
    .limit(20);

  const attemptRows = attempts ?? [];
  const attemptIds = attemptRows.map((row) => row.id);

  const { data: responseRows } = attemptIds.length
    ? await supabase
        .from('writing_responses')
        .select('exam_attempt_id, overall_band')
        .in('exam_attempt_id', attemptIds)
    : { data: [] };

  const { data: reviewRows } = attemptIds.length
    ? await supabase
        .from('writing_reviews')
        .select('attempt_id, scores_json, created_at')
        .in('attempt_id', attemptIds)
    : { data: [] };

  const history: AttemptHistory[] = attemptRows.map((row) => {
    const metadata = (row.metadata as Record<string, unknown> | null) ?? null;
    const mockId = typeof metadata?.mockId === 'string' ? (metadata.mockId as string) : null;
    const summary = mockId ? summaryMap.get(mockId) : undefined;

    const responses = (responseRows ?? []).filter((resp) => resp.exam_attempt_id === row.id);
    const aiBand = responses.length
      ? Number(
          (
            responses.reduce((total, resp) => total + Number(resp.overall_band ?? 0), 0) /
            responses.length
          ).toFixed(1),
        )
      : null;

    const reviews = (reviewRows ?? [])
      .filter((review) => review.attempt_id === row.id)
      .sort((a, b) => new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime());

    let teacherBand: number | null = null;
    if (reviews.length > 0) {
      const latest = reviews[0];
      const scores = (latest.scores_json as Record<string, number> | null) ?? null;
      if (scores) {
        const values = Object.values(scores)
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        if (values.length > 0) {
          teacherBand = Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(1));
        }
      }
    }

    let status: AttemptStatus = 'in_progress';
    if (reviews.length > 0) {
      status = 'reviewed';
    } else if (aiBand !== null || row.status === 'completed' || row.status === 'submitted') {
      status = 'completed';
    }

    const title = summary?.title ?? 'Writing mock attempt';
    const taskLabel = summary?.task1Type ? `${summary.task1Type} · ${summary?.register ?? 'Neutral'}` : 'Custom attempt';
    const startedAt = row.started_at ?? row.submitted_at ?? row.updated_at ?? new Date().toISOString();

    return {
      attemptId: row.id,
      mockId,
      title,
      taskLabel,
      startedAt,
      status,
      aiBand,
      teacherBand,
    };
  });

  return { props: { history } };
};

export default WritingMockIndexPage;
