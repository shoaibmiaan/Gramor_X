// pages/study-buddy/session/[id]/practice.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Alert } from '@/components/design-system/Alert';
import { Container } from '@/components/design-system/Container';

type SessionItem = {
  skill: string;
  minutes: number;
};

type StudySession = {
  id: string;
  user_id?: string | null;
  items: SessionItem[];
  state: 'pending' | 'started' | 'completed' | 'cancelled';
  created_at?: string | null;
  updated_at?: string | null;
};

const seconds = (mins: number) => Math.max(0, Math.floor(mins * 60));

const PracticeRunner: NextPage = () => {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // runtime state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const [savingMistake, setSavingMistake] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);

  // Load session
  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabaseBrowser
        .from<StudySession>('study_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (fetchErr) {
        console.error('[practice] load session error', fetchErr);
        setError(fetchErr.message ?? 'failed_to_load_session');
        setSession(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('session_not_found');
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(data);
      // set currentIndex to first item if session not started, otherwise keep at 0
      setCurrentIndex(0);
      setRemainingSec(data.items && data.items.length ? seconds(data.items[0].minutes) : null);
    } catch (err: any) {
      console.error('[practice] unexpected load error', err);
      setError(err?.message ?? 'unexpected');
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    void loadSession(id);
  }, [id, loadSession]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (remainingSec == null) {
      setIsRunning(false);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          // finish this item
          window.clearInterval(timerRef.current!);
          timerRef.current = null;
          setIsRunning(false);
          // move to next item after a small pause so UI can show 0
          setTimeout(() => {
            handleFinishItem();
          }, 700);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, remainingSec]);

  // Start session (server-side mark started and set UI to running)
  const handleStartSession = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLastActionMsg(null);
    try {
      // Call server endpoint to mark started
      const resp = await fetch(`/api/study-buddy/sessions/${encodeURIComponent(id)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });
      const body = await resp.json();
      if (!resp.ok) {
        console.error('[practice] start failed', resp.status, body);
        setError(body?.error ?? `start_failed_${resp.status}`);
        return;
      }
      // server returns session row as body.session
      const updated: StudySession = body.session ?? body;
      setSession(updated);
      // set timer for first item
      const first = updated.items?.[0] ?? null;
      setCurrentIndex(0);
      setRemainingSec(first ? seconds(first.minutes) : null);
      setIsRunning(true);
      setLastActionMsg('Session started');
    } catch (err: any) {
      console.error('[practice] start exception', err);
      setError(err?.message ?? 'network_error');
    }
  }, [id]);

  // Finish current item and advance
  const handleFinishItem = useCallback(async () => {
    setLastActionMsg(null);
    if (!session) return;

    // if last item => mark session completed
    const nextIndex = currentIndex + 1;
    if (nextIndex >= (session.items?.length ?? 0)) {
      // mark completed in DB (client-side update)
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabaseBrowser
          .from('study_sessions')
          .update({ state: 'completed', updated_at: now })
          .eq('id', session.id)
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('[practice] complete update failed', error);
          setError(error.message ?? 'complete_failed');
          return;
        }
        setSession(data ?? { ...session, state: 'completed' });
        setIsRunning(false);
        setRemainingSec(null);
        setLastActionMsg('Session completed');
        return;
      } catch (err: any) {
        console.error('[practice] complete exception', err);
        setError(err?.message ?? 'complete_failed');
        return;
      }
    }

    // otherwise advance to next and auto-start
    const nextItem = session.items[nextIndex];
    setCurrentIndex(nextIndex);
    setRemainingSec(seconds(nextItem.minutes));
    setIsRunning(true);
    setLastActionMsg(`Moving to ${nextItem.skill}`);
  }, [currentIndex, session]);

  // Pause / resume
  const handleToggle = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  // Skip item (mark as skipped and advance)
  const handleSkip = useCallback(() => {
    // stop current timer
    setIsRunning(false);
    setRemainingSec(null);
    // move to next
    void handleFinishItem();
  }, [handleFinishItem]);

  // Save a simple mistake to mistakes_book using supabase client
  const handleSaveMistake = useCallback(
    async (note: string, skill?: string) => {
      if (!session) return;
      setSavingMistake(true);
      setError(null);
      try {
        const payload = {
          user_id: session.user_id ?? null,
          mistake: note,
          correction: null,
          type: skill ?? session.items?.[currentIndex]?.skill ?? 'general',
          retry_path: null,
          tags: null,
          last_seen_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseBrowser.from('mistakes_book').insert(payload).select('id').maybeSingle();
        if (error) {
          console.error('[practice] save mistake failed', error);
          setError(error.message ?? 'save_mistake_failed');
        } else {
          setLastActionMsg('Saved mistake');
        }
      } catch (err: any) {
        console.error('[practice] save mistake exception', err);
        setError(err?.message ?? 'save_mistake_failed');
      } finally {
        setSavingMistake(false);
      }
    },
    [session, currentIndex],
  );

  // Human-friendly time
  const formatTime = (sec: number | null) => {
    if (sec == null) return '--:--';
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentItem = useMemo(() => {
    if (!session) return null;
    return session.items?.[currentIndex] ?? null;
  }, [session, currentIndex]);

  // Quick finish session (complete)
  const handleForceComplete = useCallback(async () => {
    if (!session) return;
    try {
      setIsRunning(false);
      setRemainingSec(null);
      const now = new Date().toISOString();
      const { data, error } = await supabaseBrowser
        .from('study_sessions')
        .update({ state: 'completed', updated_at: now })
        .eq('id', session.id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[practice] force complete failed', error);
        setError(error.message ?? 'force_complete_failed');
        return;
      }
      setSession(data ?? { ...session, state: 'completed' });
      setLastActionMsg('Marked completed');
    } catch (err: any) {
      console.error('[practice] force complete exception', err);
      setError(err?.message ?? 'force_complete_failed');
    }
  }, [session]);

  if (loading) {
    return (
      <Container>
        <div className="py-24">
          <Card className="p-6">
            <div>Loading session…</div>
          </Card>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="py-12">
          <Alert variant="danger">{error}</Alert>
          <div className="mt-4">
            <Button onClick={() => (id ? void loadSession(id) : router.push('/study-buddy'))}>Retry</Button>
            <Link href="/study-buddy" className="ml-2"><Button variant="ghost">Back</Button></Link>
          </div>
        </div>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container>
        <div className="py-24">
          <Card className="p-6">
            <h2>Session not found</h2>
            <div className="mt-4">
              <Link href="/study-buddy"><Button>Back to Study Buddy</Button></Link>
            </div>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Practice — Study Buddy</title>
      </Head>

      <Container>
        <div className="py-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Practice Session</h1>
              <div className="text-sm text-muted-foreground">Session ID: {session.id}</div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigator.share ? navigator.share({ title: 'My practice session', text: `Session ${session.id}` }) : navigator.clipboard?.writeText(window.location.href)}>Share</Button>
              <Link href="/study-buddy"><Button variant="ghost">Back</Button></Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Current task</div>
                  <div className="mt-2 text-lg font-medium">{currentItem ? `${currentItem.skill}` : 'No tasks'}</div>
                </div>

                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className="mt-1 text-3xl font-mono">{formatTime(remainingSec)}</div>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                {session.state === 'pending' ? (
                  <Button onClick={handleStartSession} variant="primary">Start session</Button>
                ) : (
                  <>
                    <Button onClick={handleToggle} variant="primary">{isRunning ? 'Pause' : 'Resume'}</Button>
                    <Button onClick={handleSkip} variant="secondary">Skip</Button>
                    <Button onClick={() => {
                      const note = window.prompt('Describe the mistake or note to save:') || '';
                      if (note) void handleSaveMistake(note, currentItem?.skill);
                    }} variant="ghost" disabled={savingMistake}>{savingMistake ? 'Saving…' : 'Record mistake'}</Button>
                    <Button onClick={handleForceComplete} variant="danger">Finish session</Button>
                  </>
                )}
              </div>

              {lastActionMsg && <div className="mt-4 text-sm text-muted-foreground">{lastActionMsg}</div>}
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Session details</div>
              <div className="mt-3 space-y-2">
                <div><strong>Items:</strong> {session.items?.length ?? 0}</div>
                <div><strong>State:</strong> {session.state}</div>
                <div><strong>Current index:</strong> {currentIndex + 1} / {session.items?.length ?? 0}</div>
                <div className="mt-3">
                  <h4 className="font-medium">Upcoming</h4>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                    {session.items?.map((it, i) => (
                      <li key={`${it.skill}-${i}`} className={i === currentIndex ? 'font-semibold' : ''}>
                        {i + 1}. {it.skill} — {it.minutes} min {i === currentIndex ? '(current)' : ''}
                      </li>
                    )) ?? <li>No items</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="ghost" onClick={() => void loadSession(session.id)}>Refresh</Button>
                {/* Dev helper: link to admin list if you have it */}
                <Link href="/api/dev/study-sessions/list"><Button variant="ghost">Admin list</Button></Link>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
};

export default PracticeRunner;
