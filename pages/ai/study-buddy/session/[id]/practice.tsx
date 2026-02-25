// pages/ai/study-buddy/session/[id]/practice.tsx
import type { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getServerClient } from '@/lib/supabaseServer';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import { useToast } from '@/components/design-system/Toaster';

const AI_TIPS: Record<string, string[]> = {
  Listening: [
    'Listen once for gist, then replay for detail.',
    'Note keywords rather than full sentences to stay focused.',
  ],
  Reading: [
    'Skim the passage for structure before diving into questions.',
    'Underline transition words — they signal the author’s intent.',
  ],
  Writing: [
    'Draft in bullet points before polishing full sentences.',
    'Aim for one key example per paragraph to keep ideas sharp.',
  ],
  Speaking: [
    'Record yourself and replay to catch filler words.',
    'Pause, breathe, then answer — confident pacing beats speed.',
  ],
  General: [
    'Check in with your posture and breathe between tasks.',
    'Celebrating micro-wins keeps motivation high.',
  ],
};

const seconds = (m: number) => Math.max(0, Math.floor(m * 60));

export type SessionItem = {
  skill: string;
  minutes: number;
  topic: string | null;
  status: 'pending' | 'started' | 'completed';
  note: string | null;
};

export type StudySession = {
  id: string;
  user_id: string;
  items: SessionItem[];
  state: 'pending' | 'started' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  xp_earned: number;
};

type Props = { id: string; initial: StudySession | null };

function normaliseSession(session: any | null): StudySession | null {
  if (!session) return null;
  const items: SessionItem[] = Array.isArray(session.items)
    ? session.items.map((item: any) => ({
        skill: item.skill,
        minutes: Number(item.minutes || 0),
        topic: item.topic ?? null,
        status: (item.status as SessionItem['status']) ?? 'pending',
        note: item.note ?? null,
      }))
    : [];
  return {
    id: session.id,
    user_id: session.user_id,
    items,
    state: session.state,
    created_at: session.created_at,
    updated_at: session.updated_at ?? null,
    started_at: session.started_at ?? null,
    ended_at: session.ended_at ?? null,
    duration_minutes: session.duration_minutes ?? null,
    xp_earned: session.xp_earned ?? 0,
  };
}

function deriveCurrentIndex(items: SessionItem[]): number {
  if (!items.length) return 0;
  const nextIdx = items.findIndex((item) => item.status !== 'completed');
  return nextIdx === -1 ? items.length : nextIdx;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = String(ctx.query.id || '');
  if (!id) return { notFound: true };

  const supabase = getServerClient(ctx.req, ctx.res);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    throw userErr;
  }

  if (!user) {
    return {
      redirect: {
        destination: `/login?next=${encodeURIComponent(ctx.resolvedUrl ?? `/ai/study-buddy/session/${id}`)}`,
        permanent: false,
      },
    };
  }

  const { data: session, error } = await supabase
    .from('study_buddy_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[study-buddy/practice] load error', error);
    return { notFound: true };
  }

  return { props: { id, initial: normaliseSession(session) } };
};

const PracticePage: NextPage<Props> = ({ id, initial }) => {
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<StudySession | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const initialIndex = deriveCurrentIndex(initial?.items ?? []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const initialRemaining = (() => {
    if (!initial) return null;
    if (initialIndex < (initial.items?.length ?? 0)) {
      return seconds(initial.items[initialIndex].minutes);
    }
    return initial.items?.length ? 0 : null;
  })();
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);
  const [running, setRunning] = useState(initial?.state === 'started');
  const [completing, setCompleting] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const previousIndexRef = useRef<number>(initialIndex);

  const items = session?.items ?? [];
  const totalBlocks = items.length;
  const completedBlocks = items.filter((item) => item.status === 'completed').length;
  const progress = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;
  const isCompleted = session?.state === 'completed';

  const currentItem = useMemo(() => (currentIndex < items.length ? items[currentIndex] : null), [currentIndex, items]);
  const nextItem = useMemo(
    () => (currentIndex + 1 < items.length ? items[currentIndex + 1] : null),
    [currentIndex, items],
  );

  const fmt = useCallback((s: number | null) => {
    if (s == null) return '--:--';
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }, []);

  const updateProgress = useCallback(
    async (index: number, status: 'pending' | 'started' | 'completed') => {
      setError(null);
      try {
        const resp = await fetch(`/api/study-buddy/sessions/${encodeURIComponent(id)}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ itemIndex: index, status }),
        });
        const body = await resp.json();
        if (!resp.ok) throw new Error(body?.error || 'progress_failed');
        const updated = normaliseSession(body.session);
        setSession(updated);
        return updated;
      } catch (e: any) {
        const message = e?.message ?? 'progress_failed';
        setError(message);
        toast.error('Progress not saved', typeof message === 'string' ? message : undefined);
        return null;
      }
    },
    [id, toast],
  );

  const markStarted = useCallback(async () => {
    setError(null);
    try {
      const resp = await fetch(`/api/study-buddy/sessions/${encodeURIComponent(id)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body?.error || 'start_failed');
      const updated = normaliseSession(body.session ?? body);
      setSession(updated);
      setRunning(true);
      previousIndexRef.current = deriveCurrentIndex(updated?.items ?? []);
      if (updated && updated.items.length > 0) {
        setRemaining(seconds(updated.items[previousIndexRef.current]?.minutes ?? 0));
      }
      toast.success('Session started', 'We’ll guide you block by block.');
      if (previousIndexRef.current < (updated?.items.length ?? 0)) {
        void updateProgress(previousIndexRef.current, 'started');
      }
    } catch (e: any) {
      const message = e?.message ?? 'start_failed';
      setError(message);
      toast.error('Could not start', typeof message === 'string' ? message : undefined);
    }
  }, [id, toast, updateProgress]);

  const completeSession = useCallback(
    async (redirect = true) => {
      if (!session || session.state === 'completed') {
        if (redirect && session) {
          await router.push(`/ai/study-buddy/session/${id}/summary`);
        }
        return;
      }
      try {
        setCompleting(true);
        const resp = await fetch(`/api/study-buddy/sessions/${encodeURIComponent(id)}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
        });
        const body = await resp.json();
        if (!resp.ok) throw new Error(body?.error || 'complete_failed');
        const updated = normaliseSession(body.session ?? body);
        setSession(updated);
        setRunning(false);
        toast.success('Session logged', 'Great work — streak protected.');
        if (redirect) {
          await router.push(`/ai/study-buddy/session/${id}/summary`);
        }
      } catch (e: any) {
        const message = e?.message ?? 'complete_failed';
        setError(message);
        toast.error('Could not mark complete', typeof message === 'string' ? message : undefined);
      } finally {
        setCompleting(false);
      }
    },
    [id, router, session, toast],
  );

  const advanceToNext = useCallback(async () => {
    if (!session) return;
    const index = currentIndex;
    if (index < items.length) {
      await updateProgress(index, 'completed');
    }
    const next = index + 1;
    if (next < items.length) {
      setCurrentIndex(next);
      setRemaining(seconds(items[next].minutes));
      setRunning(true);
      previousIndexRef.current = next;
      await updateProgress(next, 'started');
    } else {
      setCurrentIndex(items.length);
      setRunning(false);
      setRemaining(0);
      await completeSession();
    }
  }, [completeSession, currentIndex, items, session, updateProgress]);

  const handleSkip = useCallback(async () => {
    if (!session) return;
    await advanceToNext();
  }, [advanceToNext, session]);

  const handleManualComplete = useCallback(async () => {
    setRunning(false);
    await completeSession();
  }, [completeSession]);

  useEffect(() => {
    if (!session) {
      setCurrentIndex(0);
      setRemaining(null);
      setRunning(false);
      return;
    }

    const nextIndex = deriveCurrentIndex(session.items);
    setCurrentIndex(nextIndex);
    if (previousIndexRef.current !== nextIndex) {
      previousIndexRef.current = nextIndex;
      if (nextIndex >= session.items.length) {
        setRemaining(0);
      } else {
        setRemaining(seconds(session.items[nextIndex].minutes));
      }
    }

    if (session.state !== 'started') {
      setRunning(false);
    }
  }, [session]);

  useEffect(() => {
    if (!running || remaining == null) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          window.clearInterval(timer);
          void advanceToNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [advanceToNext, running, remaining]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        inactivityTimeoutRef.current = window.setTimeout(() => {
          setRunning(false);
          setAutoPaused(true);
        }, 180000);
      } else {
        if (inactivityTimeoutRef.current) {
          window.clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }
        if (autoPaused) {
          toast.info('Session paused', 'We paused your timer while you were away.');
          setAutoPaused(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (inactivityTimeoutRef.current) {
        window.clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [autoPaused, toast]);

  const fmtDate = useCallback((iso: string | null | undefined) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }, []);

  const activeTips = currentItem ? AI_TIPS[currentItem.skill] ?? AI_TIPS.General ?? [] : [];

  return (
    <>
      <Head>
        <title>Practice — Study Buddy</title>
      </Head>
      <Container className="py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge variant="info">Guided practice</Badge>
            <h1 className="mt-3 text-3xl font-semibold">Focus session</h1>
            <p className="text-sm text-muted-foreground">Session ID: {id}</p>
          </div>
          <Link href="/ai/study-buddy" className="text-sm text-primary underline">
            ← Back to builder
          </Link>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {!session ? (
          <Card className="p-6 text-sm">
            <p className="mb-4 text-muted-foreground">
              Session not found or no longer accessible. Try creating a new Study Buddy session from the builder.
            </p>
            <Button onClick={markStarted}>Attempt reload</Button>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card className="relative overflow-hidden border-none bg-gradient-to-r from-vibrantPurple/90 via-electricBlue/80 to-sapphire/80 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_55%)]" />
              <div className="relative flex flex-col gap-6 p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-white/80">Current block</p>
                    <h2 className="mt-2 text-3xl font-semibold">
                      {currentItem ? currentItem.skill : 'All done!'}
                    </h2>
                    <p className="text-sm text-white/70">
                      {currentItem
                        ? currentItem.topic
                          ? `Stay on “${currentItem.topic}” for ${currentItem.minutes} minutes.`
                          : `Stay focused for ${currentItem.minutes} minutes.`
                        : 'Review your notes or celebrate a streak-safe day.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant={
                          isCompleted ? 'success' : session.state === 'started' ? 'info' : 'neutral'
                        }
                        className="bg-white/10 text-white"
                      >
                        {isCompleted ? 'Completed' : session.state === 'started' ? 'In progress' : 'Ready'}
                      </Badge>
                      <span className="rounded-ds-lg bg-white/10 px-2 py-1 text-white/70">
                        Started: {fmtDate(session.started_at)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-ds-2xl border border-white/20 bg-white/10 px-6 py-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-white/70">Time remaining</p>
                    <p className="mt-2 font-mono text-3xl font-semibold">{fmt(remaining)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                  <div className="rounded-ds-xl border border-white/20 bg-white/10 px-4 py-2">
                    Block {Math.min(currentIndex + 1, totalBlocks) || (totalBlocks ? totalBlocks : 1)} / {totalBlocks || '—'}
                  </div>
                  {nextItem && (
                    <div className="rounded-ds-xl border border-white/20 bg-white/10 px-4 py-2">
                      Next: <span className="font-semibold text-white">{nextItem.skill}</span>
                    </div>
                  )}
                  <div className="rounded-ds-xl border border-white/20 bg-white/10 px-4 py-2">
                    Planned total: {items.reduce((sum, it) => sum + it.minutes, 0)} min
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {session.state === 'pending' ? (
                    <Button size="lg" onClick={markStarted} className="bg-white text-dark hover:bg-white/90">
                      Start guided session
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        onClick={() => setRunning((r) => !r)}
                        className="bg-white text-dark hover:bg-white/90"
                        disabled={isCompleted}
                      >
                        {isCompleted ? 'Session complete' : running ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        size="lg"
                        variant="ghost"
                        className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
                        onClick={handleSkip}
                        disabled={isCompleted}
                      >
                        Skip block
                      </Button>
                      <Button
                        size="lg"
                        variant="ghost"
                        className="border border-white/30 bg-white/10 text-white hover:bg-white/20"
                        onClick={handleManualComplete}
                        loading={completing}
                        loadingText="Logging…"
                        disabled={isCompleted}
                      >
                        Mark complete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Progress</h2>
                  <span className="text-sm text-muted-foreground">{progress}% complete</span>
                </div>
                <ProgressBar value={progress} className="mt-3" />

                <div className="mt-6 space-y-3 text-sm">
                  {items.length === 0 ? (
                    <p className="text-muted-foreground">No blocks scheduled for this session.</p>
                  ) : (
                    items.map((it, i) => (
                      <div
                        key={`${it.skill}-${i}`}
                        className={`flex items-center justify-between gap-3 rounded-ds-xl border px-4 py-3 transition-colors ${
                          it.status === 'completed'
                            ? 'border-success/40 bg-success/10 text-success-foreground'
                            : i === currentIndex && session?.state !== 'completed'
                            ? 'border-primary/50 bg-primary/5 text-primary'
                            : 'border-border bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        <div>
                          <p className="text-xs uppercase tracking-wide">Block {i + 1}</p>
                          <p className="text-base font-semibold text-foreground">{it.skill}</p>
                          {it.topic && <p className="text-xs text-muted-foreground">{it.topic}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">{it.minutes} min</span>
                          <Badge
                            variant={
                              it.status === 'completed'
                                ? 'success'
                                : it.status === 'started'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {it.status === 'completed'
                              ? 'Done'
                              : it.status === 'started'
                              ? 'Now'
                              : 'Ready'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-6 text-sm text-muted-foreground">
                <h2 className="text-lg font-semibold text-foreground">AI tips</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {(activeTips.length ? activeTips : ['Stay hydrated and take a mindful breath between blocks.']).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <div className="mt-4 rounded-ds-lg bg-muted/50 p-3 text-xs">
                  <p>
                    Need a breather? Pausing for more than 3 minutes auto-saves your streak and pauses the timer.
                  </p>
                </div>
              </Card>

              <Card className="p-6 text-sm text-muted-foreground">
                <h2 className="text-lg font-semibold text-foreground">Session log</h2>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span>Started at</span>
                    <span className="text-foreground">{fmtDate(session.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last updated</span>
                    <span className="text-foreground">{fmtDate(session.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>XP earned (est.)</span>
                    <span className="text-foreground">{session.xp_earned ?? 0} XP</span>
                  </div>
                </div>
                {isCompleted && (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => router.push(`/ai/study-buddy/session/${id}/summary`)}
                  >
                    View summary →
                  </Button>
                )}
              </Card>
            </div>
          </div>
        )}
      </Container>
    </>
  );
};

export default PracticePage;
