import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
import { clearMockAttemptId, ensureMockAttemptId, fetchMockCheckpoint, saveMockCheckpoint } from '@/lib/mock/state';

type QType = 'tfng' | 'yynn' | 'heading' | 'match' | 'mcq' | 'gap';
type Q = { id: string; type: QType; prompt?: string; options?: string[]; answer: string };
type Passage = { id: string; title: string; text: string; questions: Q[] };
type ReadingPaper = { id: string; title: string; durationSec: number; passages: Passage[] };

type AnswerMap = Record<string, string>;

const DRAFT_KEY = (id: string) => `read:attempt:${id}`;

const sampleReading: ReadingPaper = {
  id: 'sample-001',
  title: 'Reading Sample 001',
  durationSec: 3600,
  passages: [
    { id: 'P1', title: 'The Honeybee', text: 'Bees are fascinating…', questions: [
      { id: 'q1', type: 'tfng', prompt: 'Bees can see UV light.', answer: 'True' },
      { id: 'q2', type: 'yynn', prompt: 'Honey is spicy.', answer: 'No' },
      { id: 'q3', type: 'heading', prompt: 'Choose paragraph heading', options: ['Origins','Vision','Diet'], answer: 'Vision' },
    ]},
    { id: 'P2', title: 'Ancient Roads', text: 'Roads enabled trade…', questions: [
      { id: 'q4', type: 'match', prompt: 'Match A with B', options: ['Roman','Silk','Inca'], answer: 'Roman' },
      { id: 'q5', type: 'mcq', prompt: 'Pick one', options: ['A','B','C'], answer: 'C' },
    ]},
  ],
};

const loadPaper = async (id: string): Promise<ReadingPaper> => {
  try { const mod = await import(`@/data/reading/${id}.json`); return mod.default as ReadingPaper; } catch { return sampleReading; }
};

const Shell: React.FC<{ title: string; right?: React.ReactNode; children: React.ReactNode }> = ({ title, right, children }) => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-h3 font-semibold">{title}</h1>
        <div className="flex items-center gap-3">{right}</div>
      </header>
      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        {children}
      </div>
    </div>
  </div>
);

export default function ReadingMockPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const [paper, setPaper] = useState<ReadingPaper | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [passageIdx, setPassageIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3600);
  const attemptRef = useRef<string>('');
  const [attemptReady, setAttemptReady] = useState(false);
  const [checkpointHydrated, setCheckpointHydrated] = useState(false);
  const latestRef = useRef<{ answers: AnswerMap; passageIdx: number; timeLeft: number }>({ answers: {}, passageIdx: 0, timeLeft: 0 });

  useEffect(() => {
    if (!id) return;
    const attempt = ensureMockAttemptId('reading', id);
    attemptRef.current = attempt;
    setAttemptReady(true);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const p = await loadPaper(id);
      setPaper(p);
      setTimeLeft(p.durationSec);
      const dr = loadDraft(id);
      if (dr) {
        setAnswers(dr.answers || {});
        if (typeof dr.passageIdx === 'number') setPassageIdx(dr.passageIdx);
      }
      if (!dr) saveDraft(id, { answers: {}, passageIdx: 0 });
    })();
  }, [id]);

  useEffect(() => {
    if (!paper || !attemptReady) return;
    let cancelled = false;

    (async () => {
      const checkpoint = await fetchMockCheckpoint({ attemptId: attemptRef.current, section: 'reading' });
      if (cancelled) return;
      if (checkpoint && checkpoint.mockId === paper.id) {
        const payload = (checkpoint.payload || {}) as { answers?: AnswerMap; passageIdx?: number };
        if (payload.answers) setAnswers(payload.answers);
        if (typeof payload.passageIdx === 'number') setPassageIdx(payload.passageIdx);
        const duration = typeof checkpoint.duration === 'number' ? checkpoint.duration : paper.durationSec;
        const remaining = Math.max(0, duration - checkpoint.elapsed);
        setTimeLeft(Math.max(0, Math.min(paper.durationSec, remaining)));
      }
      setCheckpointHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [paper, attemptReady]);

  useEffect(() => {
    if (!paper) return;
    const t = setInterval(() => setTimeLeft((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [paper]);

  useEffect(() => {
    latestRef.current = { answers, passageIdx, timeLeft };
  }, [answers, passageIdx, timeLeft]);

  useEffect(() => {
    if (!id) return;
    saveDraft(id, { answers, passageIdx });
  }, [id, answers, passageIdx]);

  const persistCheckpoint = useCallback(
    (opts?: { completed?: boolean }) => {
      if (!paper || !attemptReady || !checkpointHydrated || !attemptRef.current) return;
      const state = latestRef.current;
      const elapsed = Math.max(0, Math.min(paper.durationSec, paper.durationSec - state.timeLeft));
      void saveMockCheckpoint({
        attemptId: attemptRef.current,
        section: 'reading',
        mockId: paper.id,
        payload: { paperId: paper.id, answers: state.answers, passageIdx: state.passageIdx },
        elapsed,
        duration: paper.durationSec,
        completed: opts?.completed,
      });
    },
    [paper, attemptReady, checkpointHydrated]
  );

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handler = () => persistCheckpoint();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const handle = setTimeout(() => persistCheckpoint(), 1000);
    return () => clearTimeout(handle);
  }, [answers, passageIdx, paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  useEffect(() => {
    if (!paper || !attemptReady || !checkpointHydrated) return;
    const interval = setInterval(() => persistCheckpoint(), 15000);
    return () => clearInterval(interval);
  }, [paper, attemptReady, checkpointHydrated, persistCheckpoint]);

  const current = paper?.passages[passageIdx];

  const submit = async () => {
    if (!paper || !id) return;
    const flatQ = paper.passages.flatMap((p) => p.questions);
    let correct = 0;
    for (const q of flatQ) if (normalize(answers[q.id] || '') === normalize(q.answer)) correct++;
    const percentage = Math.round((correct / flatQ.length) * 100);
    let attemptId = '';
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user?.id) throw new Error('Not authenticated');
      const payload = { user_id: u.user.id, paper_id: paper.id, answers, score: correct, total: flatQ.length, percentage, submitted_at: new Date().toISOString(), duration_sec: paper.durationSec - timeLeft };
      const { data, error } = await supabase.from('attempts_reading').insert(payload).select('id').single();
      if (error) throw error;
      attemptId = data.id as unknown as string;
    } catch {
      attemptId = `local-${Date.now()}`;
      try { localStorage.setItem(`read:attempt-res:${attemptId}`, JSON.stringify({ paper, answers })); } catch {}
    } finally {
      if (attemptRef.current) {
        void saveMockCheckpoint({
          attemptId: attemptRef.current,
          section: 'reading',
          mockId: paper.id,
          payload: { paperId: paper.id, answers, passageIdx },
          elapsed: paper.durationSec - timeLeft,
          duration: paper.durationSec,
          completed: true,
        });
        clearMockAttemptId('reading', paper.id);
      }
      clearDraft(id);
      router.replace(`/review/reading/${id}?attempt=${attemptId}`);
    }
  };

  if (!paper || !current) return <Shell title="Loading..."><div className="rounded-2xl border border-border p-4">Loading paper…</div></Shell>;

  const palette = paper.passages.flatMap((p) => p.questions.map((q) => q.id));
  const answered = Object.keys(answers).length;
  const percent = Math.round((answered / palette.length) * 100);

  return (
    <Shell
      title={`Reading — ${paper.title}`}
      right={
        <>
          <div className="text-small text-foreground/80">Answered {percent}%</div>
          <div className="rounded-full border border-border px-3 py-1 text-small">⏱ {hhmmss(timeLeft)}</div>
        </>
      }
    >
      {/* Left: passage + questions */}
      <div className="rounded-2xl border border-border p-4 bg-background/50">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-small font-medium">Passage {passageIdx + 1} of {paper.passages.length} — {current.title}</div>
          <div className="flex gap-2">
            <button disabled={passageIdx === 0} onClick={() => setPassageIdx((i) => Math.max(0, i - 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Prev</button>
            <button disabled={passageIdx === paper.passages.length - 1} onClick={() => setPassageIdx((i) => Math.min(paper.passages.length - 1, i + 1))} className="rounded-lg border border-border px-3 py-1 text-small hover:border-primary">Next</button>
          </div>
        </div>
        <article className="prose prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-small leading-6 text-foreground/90">{current.text}</p>
        </article>
        <div className="mt-4 grid gap-3">
          {current.questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-border p-3">
              <div className="mb-1 text-small font-medium">{q.prompt || q.id}</div>
              {renderInput(q, answers[q.id] || '', (val) => setAnswers((a) => ({ ...a, [q.id]: val })))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={submit} className="rounded-xl bg-primary px-4 py-2 font-medium text-background hover:opacity-90">Submit for scoring</button>
        </div>
      </div>

      {/* Right: palette */}
      <aside className="rounded-2xl border border-border p-4 bg-background/50">
        <div className="mb-2 text-small font-medium">Question palette</div>
        <div className="grid grid-cols-5 gap-2">
          {palette.map((qid, idx) => (
            <div key={qid} className={`rounded text-center text-caption py-1 border ${answers[qid] ? 'border-primary' : 'border-border'}`}>{idx + 1}</div>
          ))}
        </div>
        <div className="mt-4">
          <Link href="/reading" className="text-small underline underline-offset-4">Change test</Link>
        </div>
      </aside>
    </Shell>
  );
}

function renderInput(q: Q, value: string, onChange: (v: string) => void) {
  if (q.type === 'tfng') {
    const opts = ['True', 'False', 'Not Given'];
    return <Options options={opts} value={value} onPick={onChange} />;
  }
  if (q.type === 'yynn') {
    const opts = ['Yes', 'No', 'Not Given'];
    return <Options options={opts} value={value} onPick={onChange} />;
  }
  if (q.type === 'heading' || q.type === 'match' || q.type === 'mcq') {
    return <Options options={q.options || []} value={value} onPick={onChange} />;
  }
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" placeholder="Type your answer" />
  );
}
const Options: React.FC<{ options: string[]; value: string; onPick: (v: string) => void }> = ({ options, value, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((opt) => (
      <button key={opt} onClick={() => onPick(opt)} type="button" className={`rounded-lg border px-3 py-1 text-small hover:border-primary ${value === opt ? 'border-primary' : 'border-border'}`}>{opt}</button>
    ))}
  </div>
);
type DraftState = { answers: AnswerMap; passageIdx?: number };
const saveDraft = (id: string, data: DraftState) => { try { localStorage.setItem(DRAFT_KEY(id), JSON.stringify(data)); } catch {} };
const loadDraft = (id: string): DraftState | null => { try { const raw = localStorage.getItem(DRAFT_KEY(id)); return raw ? JSON.parse(raw) : null; } catch { return null; } };
const clearDraft = (id: string) => { try { localStorage.removeItem(DRAFT_KEY(id)); } catch {} };
const hhmmss = (sec: number) => `${Math.floor(sec/60).toString().padStart(2,'0')}:${Math.floor(sec%60).toString().padStart(2,'0')}`;
const normalize = (s: string) => s.trim().toLowerCase();
