// pages/challenge/[cohort].tsx
import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { Leaderboard } from '@/components/challenge/Leaderboard';
import { TaskList } from '@/components/challenge/TaskList';
import { Container } from '@/components/design-system/Container';
import type { ChallengeTask, ChallengeTaskStatus } from '@/types/challenge';
import { useChallengeEnrollments } from '@/hooks/useChallengeEnrollments';
import { useSupabaseSessionUser } from '@/hooks/useSupabaseSessionUser';

function genTasks(startISO: string, days = 14): ChallengeTask[] {
  const base = new Date(startISO);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const day = i + 1;
    const titleMap = [
      'Listening: Section 1 speed read',
      'Reading: TF/NG quick set',
      'Writing: Task-2 intro + thesis',
      'Speaking: Part-1 cadence',
    ];
    return {
      day,
      title: titleMap[i % titleMap.length],
      description: 'Auto-generated challenge task',
      dueDate: d.toISOString().slice(0, 10),
      status: 'pending',
    };
  });
}

export default function CohortDetailPage() {
  const router = useRouter();
  const cohort = (router.query.cohort as string) || '';

  const { userId, loading: userLoading } = useSupabaseSessionUser();
  const { enrollments, loading: enrollmentsLoading, refresh } = useChallengeEnrollments(userId);
  const autoEnrollAttemptedRef = React.useRef(false);
  const [tasks, setTasks] = React.useState<ChallengeTask[]>([]);
  const [startISO, setStartISO] = React.useState<string>('2025-09-05');

  React.useEffect(() => {
    // derive start date per known cohort id (can come from CMS later)
    if (!cohort) return;
    if (cohort === 'BandBoost-Sep2025') setStartISO('2025-09-05');
    else if (cohort === 'WritingFocus-Oct2025') setStartISO('2025-10-01');
    else if (cohort === 'SpeakingFluency-Oct2025') setStartISO('2025-10-10');
    else setStartISO(new Date().toISOString().slice(0, 10)); // fallback today
  }, [cohort]);

  React.useEffect(() => {
    setTasks(genTasks(startISO, 14));
  }, [startISO]);

  React.useEffect(() => {
    autoEnrollAttemptedRef.current = false;
  }, [cohort, userId]);

  React.useEffect(() => {
    if (!cohort || !userId || enrollmentsLoading) return;
    const hasEnrollment = enrollments.some((row) => row.cohort === cohort);
    if (hasEnrollment || autoEnrollAttemptedRef.current) return;

    autoEnrollAttemptedRef.current = true;

    void (async () => {
      try {
        const res = await fetch('/api/challenge/enroll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cohort }),
        });
        if (res.ok) {
          await refresh();
        } else {
          const payload = await res.json().catch(() => ({}));
          console.error('[challenge] auto-enroll failed', payload?.error);
        }
      } catch (error) {
        console.error('[challenge] auto-enroll request failed', error);
      }
    })();
  }, [cohort, userId, enrollments, enrollmentsLoading, refresh]);

  const enrollment = React.useMemo((): { id: string; progress: Record<string, ChallengeTaskStatus> } | null => {
    if (!cohort) return null;
    const match = enrollments.find((row) => row.cohort === cohort);
    if (!match) return null;
    return {
      id: match.id,
      progress: (match.progress ?? {}) as Record<string, ChallengeTaskStatus>,
    };
  }, [cohort, enrollments]);

  const done = enrollment ? Object.values(enrollment.progress).filter((s) => s === 'done').length : 0;
  const pct = Math.round((done / tasks.length) * 100);

  const isEnrollmentLoading = userLoading || enrollmentsLoading;

  return (
    <>
      <Head>
        <title>{cohort ? `${cohort} · Challenge` : 'Challenge'} · GramorX</title>
        <meta name="description" content="Daily micro-tasks, progress tracking, and leaderboards." />
      </Head>

      <div className="py-6">
        <Container>
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-h2 font-bold text-foreground">{cohort || 'Challenge'}</h1>
              <p className="text-small text-muted-foreground">
                {tasks.length} tasks • {pct}% complete
              </p>
            </div>
            <nav className="flex items-center gap-3">
              <Link
                href="/challenge"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-small text-foreground hover:bg-border/30"
              >
                All Challenges
              </Link>
              <Link
                href="/progress"
                className="rounded-md border border-border bg-background px-3 py-1.5 text-small text-foreground hover:bg-border/30"
              >
                Progress
              </Link>
            </nav>
          </header>

          {!userId && !userLoading ? (
            <div className="rounded-xl border border-border bg-card p-4 text-small text-muted-foreground">
              Please{' '}
              <Link href={`/login?next=${encodeURIComponent(router.asPath)}`} className="text-primary underline-offset-2 hover:underline">
                log in
              </Link>{' '}
              to join and track this challenge.
            </div>
          ) : isEnrollmentLoading ? (
            <div className="rounded-xl border border-border bg-card p-4 text-small text-muted-foreground">
              Preparing your enrollment…
            </div>
          ) : !enrollment ? (
            <div className="rounded-xl border border-border bg-card p-4 text-small text-muted-foreground">
              We couldn’t load your enrollment. Please try again.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <TaskList
                  enrollmentId={enrollment.id}
                  tasks={tasks}
                  progress={enrollment.progress}
                  onUpdate={async () => {
                    // optimistic update — let TaskList default POST handle network
                    // also refresh local enrollment to keep leaderboard accurate
                    await refresh();
                  }}
                />
              </div>

              <aside className="lg:col-span-2">
                <Leaderboard cohortId={cohort} />
                <div className="mt-4 rounded-lg border border-border bg-card p-3 text-caption text-muted-foreground">
                  Tip: finish today’s task first — momentum is everything. Need help? Try{' '}
                  <Link href="/ai?sidebar=1" className="text-primary underline-offset-2 hover:underline">
                    AI Sidebar
                  </Link>
                  .
                </div>
              </aside>
            </div>
          )}
        </Container>
      </div>
    </>
  );
}
