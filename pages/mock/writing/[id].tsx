import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import {
  clearMockAttemptId,
  clearMockDraft,
  ensureMockAttemptId,
  fetchMockCheckpoint,
  loadMockDraft,
  saveMockCheckpoint,
  saveMockDraft,
} from '@/lib/mock/state';
import samplePaper from '@/data/writing/sample-001.json';
import {
  findExamSummary,
  normalizeWritingPaper,
  toMockPaper,
} from '@/data/writing/exam-index';
import { useDebouncedCallback } from 'use-debounce';

type MockWritingPaper = {
  id: string;
  title: string;
  task1Prompt: string;
  task2Prompt: string;
  minWordsTask1: number;
  minWordsTask2: number;
  durationSec: number;
};

const fallbackPaper: MockWritingPaper = toMockPaper(normalizeWritingPaper(samplePaper));

const loadPaper = async (id: string): Promise<MockWritingPaper> => {
  try {
    const mod = await import(`@/data/writing/${id}.json`);
    return toMockPaper(normalizeWritingPaper(mod.default));
  } catch {
    return fallbackPaper;
  }
};

const Shell: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-h3 font-semibold">{title}</h1>
        <div className="flex items-center gap-3">{right}</div>
      </header>
      <div className="rounded-2xl border border-border p-4 sm:p-6 bg-background/50 shadow-sm">{children}</div>
    </div>
  </div>
);

export default function WritingMockPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [paper, setPaper] = useState<MockWritingPaper | null>(null);
  const [task1, setTask1] = useState('');
  const [task2, setTask2] = useState('');
  const [timeLeft, setTimeLeft] = useState(3600);
  const attemptRef = useRef<string>('');
  const [attemptReady, setAttemptReady] = useState(false);
  const [checkpointHydrated, setCheckpointHydrated] = useState(false);
  const latestRef = useRef<{ task1: string; task2: string; timeLeft: number }>({ task1: '', task2: '', timeLeft: 0 });

  useEffect(() => {
    if (!id) return;
    const attempt = ensureMockAttemptId('writing', id);
    attemptRef.current = attempt;
    setAttemptReady(true);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await loadPaper(id);
      setPaper(p);
      const draft = loadMockDraft<{ task1?: string; task2?: string; timeLeft?: number }>('writing', id);
      if (draft?.data) {
        if (typeof draft.data.task1 === 'string') setTask1(draft.data.task1);
        if (typeof draft.data.task2 === 'string') setTask2(draft.data.task2);
        if (typeof draft.data.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(p.durationSec, Math.round(draft.data.timeLeft))));
        } else {
          setTimeLeft(p.durationSec);
        }
      } else {
        setTimeLeft(p.durationSec);
        saveMockDraft('writing', id, { task1: '', task2: '', timeLeft: p.durationSec });
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!paper || !attemptReady) return;
    let cancelled = false;

    (async () => {
      const checkpoint = await fetchMockCheckpoint({ attemptId: attemptRef.current, section: 'writing' });
      if (cancelled) return;
      if (checkpoint && checkpoint.mockId === paper.id) {
        const payload = (checkpoint.payload || {}) as { task1?: string; task2?: string; timeLeft?: number };
        if (typeof payload.task1 === 'string') setTask1(payload.task1);
        if (typeof payload.task2 === 'string') setTask2(payload.task2);
        if (typeof payload.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, Math.round(payload.timeLeft))));
        } else {
          const duration = typeof checkpoint.duration === 'number' ? checkpoint.duration : paper.durationSec;
          const remaining = Math.max(0, duration - checkpoint.elapsed);
          setTimeLeft(Math.max(0, Math.min(paper.durationSec, remaining)));
        }
      }
      setCheckpointHydrated(true);
    })();

    return () => { cancelled = true; };
  }, [paper, attemptReady]);

  useEffect(() => {
    if (!paper) return;
    const t = setInterval(() => setTimeLeft((x) => (x>0?x-1:0)), 1000);
    return () => clearInterval(t);
  }, [paper]);
  useEffect(() => {
    latestRef.current = { task1, task2, timeLeft };
  }, [task1, task2, timeLeft]);
  const debouncedLocalDraft = useDebouncedCallback(
    (payload: { task1: string; task2: string; timeLeft: number }) => {
      if (!id) return;
      saveMockDraft('writing', id, payload);
    },
    500,
    { maxWait: 3000 }
  );

  useEffect(() => {
    if (!id) return;
    debouncedLocalDraft({ task1, task2, timeLeft });
    return () => {
      debouncedLocalDraft.flush();
    };
  }, [id, task1, task2, timeLeft, debouncedLocalDraft]);

  const persistCheckpoint = useCallback(
    (opts?: { completed?: boolean }) => {
      if (!paper || !attemptReady || !checkpointHydrated || !attemptRef.current) return;
      const state = latestRef.current;
      const elapsed = Math.max(0, Math.min(paper.durationSec, paper.durationSec - state.timeLeft));
      void saveMockCheckpoint({
        attemptId: attemptRef.current,
        section: 'writing',
        mockId: paper.id,
        payload: { paperId: paper.id, task1: state.task1, task2: state.task2, timeLeft: state.timeLeft },
        elapsed,
        duration: paper.durationSec,
        completed: opts?.completed,
      });
    },
    [paper, attemptReady, checkpointHydrated]
  );

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handler = () => {
      debouncedLocalDraft.flush();
      persistCheckpoint();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint, debouncedLocalDraft]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const timeout = setTimeout(() => persistCheckpoint(), 800);
    return () => clearTimeout(timeout);
  }, [task1, task2, paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const interval = setInterval(() => persistCheckpoint(), 15000);
    return () => clearInterval(interval);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  const wc1 = countWords(task1);
  const wc2 = countWords(task2);
  const ok = useMemo(() => {
    if (!paper) return false;
    return wc1 >= paper.minWordsTask1 && wc2 >= paper.minWordsTask2;
  }, [paper, wc1, wc2]);

  const submit = async () => {
    if (!paper || !id) return;
    let attemptId = '';
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not authenticated');
      const payload = { user_id: u.user.id, paper_id: paper.id, task1, task2, wordcount1: wc1, wordcount2: wc2, submitted_at: new Date().toISOString(), duration_sec: paper.durationSec - timeLeft };
      const { data, error } = await supabase.from('attempts_writing').insert(payload).select('id').single();
      if (error) throw error;
      attemptId = data.id as unknown as string;
    } catch {
      attemptId = `local-${Date.now()}`;
      try { localStorage.setItem(`write:attempt-res:${attemptId}`, JSON.stringify({ paper, task1, task2 })); } catch {}
    } finally {
      if (attemptRef.current) {
        void saveMockCheckpoint({
          attemptId: attemptRef.current,
          section: 'writing',
          mockId: paper.id,
          payload: { paperId: paper.id, task1, task2 },
          elapsed: paper.durationSec - timeLeft,
          duration: paper.durationSec,
          completed: true,
        });
        clearMockAttemptId('writing', paper.id);
      }
      clearMockDraft('writing', id);
      router.replace(`/review/writing/${id}?attempt=${attemptId}`);
    }
  };

  const summary = findExamSummary(id);

  if (!paper) return <Shell title="Loading…"><div>Loading…</div></Shell>;

  return (
    <Shell
      title={`Writing — ${summary?.title ?? paper.title}`}
      right={<div className="rounded-full border border-border px-3 py-1 text-small">⏱ {hhmmss(timeLeft)}</div>}
    >
      <div className="grid gap-6">
        {summary ? (
          <section className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-h4 font-semibold">{summary.title}</h2>
                <p className="mt-1 text-small text-foreground/80">{summary.description}</p>
              </div>
              <div className="text-caption text-foreground/70">~{summary.durationMinutes} min</div>
            </div>
            <div className="mt-3 grid gap-1 text-caption text-foreground/70">
              <span>Task 1: {summary.task1Focus}</span>
              <span>Task 2: {summary.task2Focus}</span>
            </div>
          </section>
        ) : null}
        <section className="rounded-xl border border-border p-4">
          <h2 className="mb-2 text-body font-semibold">Task 1</h2>
          <p className="mb-2 text-small text-foreground/80">{paper.task1Prompt}</p>
          <textarea value={task1} onChange={(e) => setTask1(e.target.value)} className="h-40 w-full rounded-lg border border-border bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
          <div className="mt-1 text-caption text-foreground/70">Words: {wc1} (min {paper.minWordsTask1})</div>
        </section>

        <section className="rounded-xl border border-border p-4">
          <h2 className="mb-2 text-body font-semibold">Task 2</h2>
          <p className="mb-2 text-small text-foreground/80">{paper.task2Prompt}</p>
          <textarea value={task2} onChange={(e) => setTask2(e.target.value)} className="h-60 w-full rounded-lg border border-border bg-background p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
          <div className="mt-1 text-caption text-foreground/70">Words: {wc2} (min {paper.minWordsTask2})</div>
        </section>

        <div className="flex items-center justify-between">
          <Link href="/writing" className="text-small underline underline-offset-4">Change test</Link>
          <button onClick={submit} disabled={!ok} className={`rounded-xl px-4 py-2 font-medium text-background ${ok ? 'bg-primary hover:opacity-90' : 'bg-border cursor-not-allowed'}`}>Submit for AI grading</button>
        </div>
      </div>
    </Shell>
  );
}
const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const hhmmss = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${Math.floor(sec%60).toString().padStart(2,'0')}`;
