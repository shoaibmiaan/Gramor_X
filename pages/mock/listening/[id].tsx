import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { getListeningPaperById } from '@/data/listening';
import {
  clearMockAttemptId,
  clearMockDraft,
  ensureMockAttemptId,
  fetchMockCheckpoint,
  loadMockDraft,
  saveMockCheckpoint,
  saveMockDraft,
} from '@/lib/mock/state';
import { useDebouncedCallback } from 'use-debounce';

type QBase = { id: string; prompt?: string; type: 'mcq' | 'gap' | 'map' | 'short'; options?: string[]; answer: string };
type Section = { id: string; title: string; audioUrl?: string; questions: QBase[] };
type ListeningPaper = { id: string; title: string; durationSec: number; transcript?: string; sections: Section[] };

type AnswerMap = Record<string, string>;
type ScoreSummary = { correct: number; total: number; percentage: number };
type DraftState = { answers: AnswerMap; startedAt: string; sectionIdx?: number; timeLeft?: number };

const samplePaper: ListeningPaper = {
  id: 'sample-001',
  title: 'Listening Sample 001',
  durationSec: 1800,
  transcript: 'This is a short transcript sample…',
  sections: [
    { id: 'S1', title: 'Section 1', audioUrl: '', questions: [
      { id: 'q1', type: 'mcq', prompt: 'Choose the correct option', options: ['A','B','C','D'], answer: 'B' },
      { id: 'q2', type: 'gap', prompt: 'Fill in the blank', answer: 'library' },
    ]},
    { id: 'S2', title: 'Section 2', audioUrl: '', questions: [
      { id: 'q3', type: 'mcq', prompt: 'Pick one', options: ['Yes','No','Maybe'], answer: 'Yes' },
      { id: 'q4', type: 'short', prompt: 'Write a short answer', answer: '2019' },
    ]},
  ],
};

const loadPaper = async (id: string): Promise<ListeningPaper> => {
  const paper = getListeningPaperById(id);
  return paper ?? samplePaper;
};

const Shell: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
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

export default function ListeningMockPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [paper, setPaper] = useState<ListeningPaper | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [secIdx, setSecIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const startRef = useRef<string>('');
  const attemptRef = useRef<string>('');
  const [attemptReady, setAttemptReady] = useState(false);
  const [checkpointHydrated, setCheckpointHydrated] = useState(false);
  const latestRef = useRef<{ answers: AnswerMap; secIdx: number; timeLeft: number }>({ answers: {}, secIdx: 0, timeLeft: 0 });

  useEffect(() => {
    if (!id) return;
    const attempt = ensureMockAttemptId('listening', id);
    attemptRef.current = attempt;
    setAttemptReady(true);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await loadPaper(id);
      setPaper(p);
      const draft = loadMockDraft<DraftState>('listening', id);
      if (draft?.data?.answers) {
        setAnswers(draft.data.answers);
        if (typeof draft.data.sectionIdx === 'number') setSecIdx(draft.data.sectionIdx);
        if (typeof draft.data.timeLeft === 'number') {
          setTimeLeft(Math.max(0, Math.min(p.durationSec, Math.round(draft.data.timeLeft))));
        } else {
          setTimeLeft(p.durationSec);
        }
      } else {
        setTimeLeft(p.durationSec);
      }
      startRef.current = draft?.data?.startedAt ?? new Date().toISOString();
      if (!draft) {
        saveMockDraft('listening', id, {
          answers: {},
          startedAt: startRef.current,
          sectionIdx: 0,
          timeLeft: p.durationSec,
        });
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!paper || !attemptReady) return;
    let cancelled = false;

    (async () => {
      const checkpoint = await fetchMockCheckpoint({ attemptId: attemptRef.current, section: 'listening' });
      if (cancelled) return;
      if (checkpoint && checkpoint.mockId === paper.id) {
        const payload = (checkpoint.payload || {}) as {
          answers?: AnswerMap;
          sectionIdx?: number;
          startedAt?: string;
          timeLeft?: number;
        };
        if (payload.answers) setAnswers(payload.answers);
        if (typeof payload.sectionIdx === 'number') setSecIdx(payload.sectionIdx);
        if (typeof payload.startedAt === 'string') startRef.current = payload.startedAt;
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

    return () => {
      cancelled = true;
    };
  }, [paper, attemptReady]);

  useEffect(() => {
    if (!id || !paper) return;
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [id, paper]);

  const debouncedLocalDraft = useDebouncedCallback(
    (payload: DraftState) => {
      if (!id) return;
      saveMockDraft('listening', id, payload);
    },
    500,
    { maxWait: 3000 }
  );

  useEffect(() => {
    if (!id) return;
    debouncedLocalDraft({ answers, startedAt: startRef.current, sectionIdx: secIdx, timeLeft });
    return () => {
      debouncedLocalDraft.flush();
    };
  }, [id, answers, secIdx, timeLeft, debouncedLocalDraft]);

  useEffect(() => {
    latestRef.current = { answers, secIdx, timeLeft };
  }, [answers, secIdx, timeLeft]);

  const persistCheckpoint = useCallback(
    (opts?: { completed?: boolean }) => {
      if (!paper || !attemptReady || !checkpointHydrated || !attemptRef.current) return;
      const state = latestRef.current;
      const elapsed = Math.max(0, Math.min(paper.durationSec, paper.durationSec - state.timeLeft));
      void saveMockCheckpoint({
        attemptId: attemptRef.current,
        section: 'listening',
        mockId: paper.id,
        payload: {
          paperId: paper.id,
          answers: state.answers,
          sectionIdx: state.secIdx,
          startedAt: startRef.current,
          timeLeft: state.timeLeft,
        },
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
    const timeout = setTimeout(() => persistCheckpoint(), 1000);
    return () => clearTimeout(timeout);
  }, [answers, secIdx, paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const interval = setInterval(() => persistCheckpoint(), 15000);
    return () => clearInterval(interval);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  const current = paper?.sections[secIdx];
  const percent = useMemo(() => {
    if (!paper) return 0;
    const total = paper.sections.reduce((acc, s) => acc + s.questions.length, 0);
    const answered = Object.keys(answers).length;
    return Math.round((answered / total) * 100);
  }, [paper, answers]);

  const hhmmss = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return (h > 0 ? `${h}:` : '') + `${m}:${s}`;
  };

  const submit = async () => {
    if (!id || !paper) return;
    const score = computeScore(paper, answers);
    let attemptId = '';
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.id) throw new Error('Not authenticated');
      const payload = {
        user_id: user.user.id,
        paper_id: paper.id,
        answers,
        score: score.correct,
        total: score.total,
        percentage: score.percentage,
        started_at: startRef.current || new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        duration_sec: paper.durationSec - timeLeft,
      };
      const { data, error } = await supabase.from('attempts_listening').insert(payload).select('id').single();
      if (error) throw error;
      attemptId = data.id as unknown as string;
    } catch {
      // fallback local-only attempt id
      attemptId = `local-${Date.now()}`;
      try { localStorage.setItem(`listen:attempt-res:${attemptId}`, JSON.stringify({ paper, answers })); } catch {}
    } finally {
      if (attemptRef.current) {
        void saveMockCheckpoint({
          attemptId: attemptRef.current,
          section: 'listening',
          mockId: paper.id,
          payload: {
            paperId: paper.id,
            answers,
            sectionIdx: secIdx,
            startedAt: startRef.current,
            timeLeft,
          },
          elapsed: paper.durationSec - timeLeft,
          duration: paper.durationSec,
          completed: true,
        });
        clearMockAttemptId('listening', paper.id);
      }
      clearMockDraft('listening', id);
      router.replace(`/review/listening/${id}?attempt=${encodeURIComponent(attemptId)}`);
    }
  };

  if (!paper || !current) return <Shell title="Loading…"><div>Loading paper…</div></Shell>;

  return (
    <Shell
      title={`Listening — ${paper.title}`}
      right={
        <>
          <div className="text-small text-foreground/80">Answered {percent}%</div>
          <div className="rounded-full border border-border px-3 py-1 text-small">
            ⏱ {hhmmss(timeLeft)}
          </div>
          <Link href="/dashboard" className="text-small underline underline-offset-4">Save & exit</Link>
        </>
      }
    >
      <div className="grid gap-6">
        {/* Section controls */}
        <div className="flex items-center justify-between">
          <div className="text-small font-medium">Section {secIdx + 1} of {paper.sections.length} — {current.title}</div>
          <div className="flex gap-2">
            <button disabled={secIdx === 0} onClick={() => setSecIdx((i) => Math.max(0, i - 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Prev</button>
            <button disabled={secIdx === paper.sections.length - 1} onClick={() => setSecIdx((i) => Math.min(paper.sections.length - 1, i + 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Next</button>
          </div>
        </div>

        {/* Audio */}
        <div className="rounded-xl border border-border p-3">
          {current.audioUrl ? (
            <audio src={current.audioUrl} controls className="w-full" />
          ) : (
            <div className="text-small text-foreground/70">No audio URL provided in this sample. (UI is wired for segmented audio if present.)</div>
          )}
        </div>

        {/* Questions */}
        <div className="grid gap-4">
          {current.questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 text-small font-medium">{q.prompt || `Question ${q.id}`}</div>
              {q.type === 'mcq' && (
                <div className="flex flex-wrap gap-2">
                  {q.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`rounded-lg border px-3 py-1 text-small hover:border-primary ${answers[q.id] === opt ? 'border-primary' : 'border-border'}`}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type !== 'mcq' && (
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="Type your answer"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Link href="/listening" className="text-small underline underline-offset-4">Change test</Link>
          <button onClick={submit} className="rounded-xl bg-primary px-4 py-2 font-medium text-background hover:opacity-90">Submit for scoring</button>
        </div>
      </div>
    </Shell>
  );
}

function computeScore(paper: ListeningPaper, answers: AnswerMap): ScoreSummary {
  const all = paper.sections.flatMap((s) => s.questions);
  let correct = 0;
  for (const q of all) {
    const given = normalize(answers[q.id] ?? '');
    const key = normalize(q.answer);
    if (given && given === key) correct++;
  }
  return { correct, total: all.length, percentage: Math.round((correct / all.length) * 100) };
}
const normalize = (s: string) => s.trim().toLowerCase();
